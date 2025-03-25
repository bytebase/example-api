import { v4 } from 'uuid';

export interface BytebaseDatabase {
    name: string;
    environment: string;
}

export async function fetchData(url: string, token: string, options: RequestInit = {}) {
    const defaultOptions: RequestInit = {
        method: "GET",
        headers: {
            'Content-Type': 'application/json',
            "Authorization": 'Bearer ' + token
        },
        cache: 'no-store'
    };

    const mergedOptions = {
        ...defaultOptions,
        ...options,
        headers: {
            ...defaultOptions.headers,
            ...options.headers
        }
    };

    const response = await fetch(url, mergedOptions);
    return response.json();
}

/* Generate token */
export async function generateBBToken() {
    const res = await fetch(`${process.env.NEXT_PUBLIC_BB_HOST}/v1/auth/login`, {
        method: "POST",
        body: JSON.stringify({
            "email": process.env.NEXT_PUBLIC_BB_SERVICE_ACCOUNT,
            "password": process.env.NEXT_PUBLIC_BB_SERVICE_KEY,
            "web": true
        }),
        headers: {
            'Content-Type': 'application/json',
            'Accept-Encoding': 'deflate, gzip',
        },
        cache: 'no-store'
    });

    const token = await res.json();
    return token.token;
}

async function createSheet(project: string, database: BytebaseDatabase, SQL: string) {
    const token = await generateBBToken();
    const newSheet = {
        name: ``,
        title: ``,
        content: Buffer.from(SQL).toString('base64'),
        "payload": {
            "type": "TYPE_UNSPECIFIED",
            "commands": [{
                "start": 1,
                "end": 1
            }]
        },
        engine: `ENGINE_UNSPECIFIED`
    };

    const response = await fetchData(`${process.env.NEXT_PUBLIC_BB_HOST}/v1/${project}/sheets`, token, {
        method: 'POST',
        body: JSON.stringify(newSheet)
    });

    return response;
}

async function createPlan(project: string, database: BytebaseDatabase, sheetName: string) {
    const token = await generateBBToken();
    const newPlan = {
        "steps": [
            {
                "specs": [
                    {
                        "id": v4(),
                        "change_database_config": {
                            "target": database.name,
                            "type": `MIGRATE`,
                            "sheet": sheetName
                        }
                    }
                ]
            }
        ],
        "title": `Change database ${database.name}`,
        "description": "MIGRATE"
    };

    const response = await fetchData(`${process.env.NEXT_PUBLIC_BB_HOST}/v1/${project}/plans`, token, {
        method: 'POST',
        body: JSON.stringify(newPlan)
    });

    return response;
}

async function createIssue(project: string, database: BytebaseDatabase, planName: string, summary: string, description: string, jiraIssueKey: string) {
 
    const token = await generateBBToken();
    const jiraBaseUrl = process.env.NEXT_PUBLIC_JIRA_BASE_URL;
    const jiraIssueUrl = `${jiraBaseUrl}/browse/${jiraIssueKey}`;
    const newIssue = {
        "approvers": [],
        "approvalTemplates": [],
        "subscribers": [],
        "title": `[JIRA>${jiraIssueKey}] ${summary}`,
        "description": `Jira Issue Link: [${jiraIssueUrl}](${jiraIssueUrl})\n\n${description}`,
        "type": "DATABASE_CHANGE",
        "plan": planName
    };

    console.log("=============success newIssue", newIssue);

    const response = await fetchData(`${process.env.NEXT_PUBLIC_BB_HOST}/v1/${project}/issues`, token, {
        method: 'POST',
        body: JSON.stringify(newIssue)
    });

    return response;
}

async function createRollout(project: string, planName: string) {
    const token = await generateBBToken();
    const newRollout = { "plan": planName };

    const response = await fetchData(`${process.env.NEXT_PUBLIC_BB_HOST}/v1/${project}/rollouts`, token, {
        method: 'POST',
        body: JSON.stringify(newRollout)
    });

    return response;
}

export async function createBBIssueWorkflow(project: string, database: BytebaseDatabase, SQL: string, summary: string, description: string, jiraIssueKey: string) {

    console.log("=============createIssueWorkflow", project, database, SQL, summary, description);
    try {
        const sheetData = await createSheet(project, database, SQL);
        console.log("--------- createdSheetData ----------", sheetData);

        const planData = await createPlan(project, database, sheetData.name);
        console.log("--------- createdPlanData ----------", planData);

        const issueData = await createIssue(project, database, planData.name, summary, description, jiraIssueKey);
        console.log("--------- createdIssue ----------", issueData);

        const rolloutData = await createRollout(project, planData.name);
        console.log("--------- createdRollout ----------", rolloutData);

        // Extract the project name from the full project string
        const projectName = project.split('/')[1];

        // Extract just the issue number from issueData.name
        const issueNumber = issueData.name.split('/').pop();

        // Construct the correct issue URL
        const issueLink = `${process.env.NEXT_PUBLIC_BB_HOST}/projects/${projectName}/issues/${issueNumber}`;

        return {
            success: true,
            message: `Issue created successfully. View it here: ${issueLink}`,
            issueData: issueData,
            issueLink: issueLink
        };
    } catch (error) {
        console.error("Error in createIssueWorkflow:", error);
        return {
            success: false,
            message: "Failed to create issue",
            error: error instanceof Error ? error.message : String(error)
        };
    }
}

export async function updateJiraIssueAfterBBIssueCreated(issueKey: string, bytebaseIssueLink: string) {
    console.log("=============update-jira-issue", issueKey, bytebaseIssueLink);

    if (!issueKey) {
        throw new Error('Issue key is missing');
    }

    const jiraApiUrl = `https://bytebase.atlassian.net/rest/api/3/issue/${issueKey}`;
    const jiraTransitionUrl = `${jiraApiUrl}/transitions`;
    const jiraAuth = Buffer.from(
        `${process.env.NEXT_PUBLIC_JIRA_EMAIL}:${process.env.NEXT_PUBLIC_JIRA_API_TOKEN}`
    ).toString('base64');

    console.log("=============update-jira-issue jiraApiUrl", jiraApiUrl);

    try {
        // First, update the Bytebase issue link
        const updateResponse = await fetch(jiraApiUrl, {
            method: 'PUT',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Authorization': `Basic ${jiraAuth}`,
            },
            body: JSON.stringify({
                fields: {
                    customfield_10039: bytebaseIssueLink
                }
            }),
        });

        if (!updateResponse.ok) {
            const updateResponseText = await updateResponse.text();
            throw new Error(`Failed to update Bytebase issue link: ${updateResponse.status} ${updateResponse.statusText} - ${updateResponseText}`);
        }

        // Fetch available transitions
        const transitionsResponse = await fetch(jiraTransitionUrl, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Authorization': `Basic ${jiraAuth}`,
            },
        });

        if (!transitionsResponse.ok) {
            throw new Error(`Failed to fetch transitions: ${transitionsResponse.status} ${transitionsResponse.statusText}`);
        }

        const transitions = await transitionsResponse.json();
        console.log("Available transitions:", transitions);

        // Find the "In Progress" transition
        const inProgressTransition = transitions.transitions.find(
            (t: any) => t.name === "In Progress"
        );

        console.log("=============inProgressTransition", inProgressTransition);

        if (!inProgressTransition) {
            throw new Error('In Progress transition not found');
        }

        // Then, transition the issue to "In Progress"
        const transitionResponse = await fetch(jiraTransitionUrl, {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Authorization': `Basic ${jiraAuth}`,
            },
            body: JSON.stringify({
                transition: {
                    id: inProgressTransition.id
                }
            }),
        });

        console.log("Transition Response status:", transitionResponse.status);
        console.log("Transition Response headers:", Object.fromEntries(transitionResponse.headers.entries()));

        const transitionResponseText = await transitionResponse.text();
        console.log("Transition Response body:", transitionResponseText);

        if (!transitionResponse.ok) {
            throw new Error(`Failed to transition Jira issue: ${transitionResponse.status} ${transitionResponse.statusText} - ${transitionResponseText}`);
        }

        return { status: 'Bytebase issue link updated and issue transitioned to In Progress', data: null };
    } catch (error) {
        console.error('Error updating Jira issue:', error);
        throw error;
    }
}

export async function updateJiraIssueStatus(issueKey: string, status: string) {
    console.log(`Updating Jira issue ${issueKey} status to ${status}`);

    if (!issueKey) {
        throw new Error('Issue key is missing');
    }

    const jiraApiUrl = `https://bytebase.atlassian.net/rest/api/3/issue/${issueKey}/transitions`;
    const jiraAuth = Buffer.from(
        `${process.env.NEXT_PUBLIC_JIRA_EMAIL}:${process.env.NEXT_PUBLIC_JIRA_API_TOKEN}`
    ).toString('base64');

    try {
        // Fetch available transitions
        const transitionsResponse = await fetch(jiraApiUrl, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Authorization': `Basic ${jiraAuth}`,
            },
        });

        if (!transitionsResponse.ok) {
            throw new Error(`Failed to fetch transitions: ${transitionsResponse.status} ${transitionsResponse.statusText}`);
        }

        const transitions = await transitionsResponse.json();
        console.log("Available transitions:", transitions);

        // Find the transition for the desired status
        const transition = transitions.transitions.find(
            (t: any) => t.to.name.toLowerCase() === status.toLowerCase()
        );

        if (!transition) {
            throw new Error(`Transition to status "${status}" not found`);
        }

        // Perform the transition
        const transitionResponse = await fetch(jiraApiUrl, {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Authorization': `Basic ${jiraAuth}`,
            },
            body: JSON.stringify({
                transition: {
                    id: transition.id
                }
            }),
        });

        if (!transitionResponse.ok) {
            const errorText = await transitionResponse.text();
            throw new Error(`Failed to transition Jira issue: ${transitionResponse.status} ${transitionResponse.statusText} - ${errorText}`);
        }

        console.log(`Successfully updated Jira issue ${issueKey} status to ${status}`);
        return { status: `Jira issue status updated to ${status}`, data: null };
    } catch (error) {
        console.error('Error updating Jira issue status:', error);
        throw error;
    }
}
