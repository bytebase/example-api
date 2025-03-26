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

  // eslint-disable-next-line no-var
  var lastBytebaseWebhook: {
    issueName: string;
    issueTitle: string;
    issueStatus: string;
    issueType: string;
    issueDescription: string;
    projectId: number;
    projectName: string;
    bytebaseIssueLink: string;
  } | null;
}

export async function GET() {
  // Retrieve the last Jira and Bytebase webhook data from the global variables
  const lastJiraWebhook = global.lastJiraWebhook || null;
  const lastBytebaseWebhook = global.lastBytebaseWebhook || null;

  return Response.json({ jira: lastJiraWebhook, bytebase: lastBytebaseWebhook });
}
