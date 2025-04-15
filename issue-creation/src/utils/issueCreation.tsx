import { v4 } from 'uuid';

async function createSheet(project: string, database: string, SQL: string) {
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

    const response = await fetch('/api/sheets/' + encodeURIComponent(project), {
        method: 'POST',
        body: JSON.stringify(newSheet)
    });

    return await response.json();
}

async function createPlan(project: string, database: string, sheetName: string) {
    const newPlan = {
        "steps": [
            {
                "specs": [
                    {
                        "id": v4(),
                        "change_database_config": {
                            "target": database,
                            "type": `MIGRATE`,
                            "sheet": sheetName
                        }
                    }
                ]
            }
        ],
        "title": `Change database ${database}`,
        "description": "MIGRATE"
    };

    const response = await fetch('/api/plans/' + encodeURIComponent(project), {
        method: 'POST',
        body: JSON.stringify(newPlan)
    });

    return await response.json();
}

async function createIssue(project: string, database: string, planName: string) {
    const newIssue = {
        "approvers": [],
        "approvalTemplates": [],
        "subscribers": [],
        "title": `Issue: Change database ${database}`,
        "description": "",
        "type": "DATABASE_CHANGE",
        "plan": planName
    };

    const response = await fetch('/api/issues/' + encodeURIComponent(project), {
        method: 'POST',
        body: JSON.stringify(newIssue)
    });

    return await response.json();
}

async function createRollout(project: string, planName: string) {
    const newRollout = { "plan": planName };

    const response = await fetch('/api/rollouts/' + encodeURIComponent(project), {
        method: 'POST',
        body: JSON.stringify(newRollout)
    });

    return await response.json();
}

export async function createIssueWorkflow(project: string, database: string, SQL: string) {
    try {
        const sheetData = await createSheet(project, database, SQL);
        console.log("--------- createdSheetData ----------", sheetData);

        const planData = await createPlan(project, database, sheetData.name);
        console.log("--------- createdPlanData ----------", planData);

        const issueData = await createIssue(project, database, planData.name);
        console.log("--------- createdIssue ----------", issueData);

        const rolloutData = await createRollout(project, planData.name);
        console.log("--------- createdRollout ----------", rolloutData);

        // Extract the project name from the full project string
        const projectName = project.split('/')[1];

        // Extract just the issue number from issueData.name
        console.log("--------- issueData ----------", issueData);
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