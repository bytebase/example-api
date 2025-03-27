// Declare the global variables
declare global {
  // eslint-disable-next-line no-var
  var lastJiraWebhook: {
    issueKey: string;
    issueType: string;
    projectKey: string;
    summary: string;
    description: string;
    sqlStatement: string;
    database: string;
    status: string;
    bytebaseIssueLink: string;
  } | null;
}

export async function GET() {
  // Retrieve the last Jira webhook data from the global variables
  const lastJiraWebhook = global.lastJiraWebhook || null;
 return Response.json({ jira: lastJiraWebhook });
}
