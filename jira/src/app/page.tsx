'use client';

import { useState, useEffect } from 'react';

interface JiraInfo {
  issueKey: string;
  issueType: string;
  projectKey: string;
  summary: string;
  description: string;
  sqlStatement: string;
  database: string;
  status: string;
  bytebaseIssueLink: string;
}

interface BytebaseInfo {
  issueName: string;
  issueTitle: string;
  issueStatus: string;
  issueType: string;
  issueDescription: string;
  projectId: number;
  projectName: string;
  bytebaseIssueLink: string;
  jiraIssueKey: string | null;
}

export default function WebhookInfoPage() {
  const [jiraInfo, setJiraInfo] = useState<JiraInfo | null>(null);
  const [bytebaseInfo, setBytebaseInfo] = useState<BytebaseInfo | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchJiraInfo = async () => {
    try {

      const response = await fetch('/api/fetch-jira-issue');
      if (response.ok) {
        const data = await response.json();
        if (data) {
          setJiraInfo(data.jira);
        }
      } else {
        console.error('Failed to fetch Jira info');
      }
    } catch (error) {
      console.error('Error fetching Jira info:', error);
    }
  };

  const pollBytebaseIssues = async () => {
    try {
      const response = await fetch('/api/poll-bytebase-issues');

      if (response.ok) {
        const data = await response.json();

        if (data && data.updatedIssues?.length > 0) {
          // Get the most recent Bytebase issue
          setBytebaseInfo(data.updatedIssues[0]);
        }
      } else {
        console.error('Failed to poll Bytebase issues');
      }
    } catch (error) {
      console.error('Error polling Bytebase issues:', error);
    }
    setLastUpdated(new Date());
  };

  useEffect(() => {
    // Initial fetches
    fetchJiraInfo();
    pollBytebaseIssues();

    // Set up polling intervals
    const jiraIntervalId = setInterval(fetchJiraInfo, 3000); // Jira every 3 seconds
    const bytebaseIntervalId = setInterval(pollBytebaseIssues, 3000); // Bytebase every 3 seconds

    // Cleanup on unmount
    return () => {
      clearInterval(jiraIntervalId);
      clearInterval(bytebaseIntervalId);
    };
  }, []);

  const renderBytebaseLink = (link: string | null) => {
    if (!link) return <span className="ml-1">Not available</span>;
    return (
      <a href={link} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline ml-1 break-all">
        {link}
      </a>
    );
  };

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-1">Webhook Monitor</h1>
      <h2 className="text-sm text-gray-500 mb-4">
        Jira updates every 3 seconds, Bytebase updates every 3 seconds
      </h2>
      <ol className="list-decimal list-inside text-sm mb-4">
        <li>A new issue created in Jira will trigger a new issue creation in Bytebase</li>
        <li>When the issue is created in Bytebase, the Jira issue will be updated with the Bytebase issue link and set to In progress</li>
        <li>When the issue in Bytebase is updated as Done, the Jira issue will be set to Done</li>
      </ol>

      {error && <p className="text-red-500 mb-4">{error}</p>}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {jiraInfo && (
          <div className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4">
            <h3 className="text-xl font-semibold mb-4">Last changed Jira Issue</h3>
            <p><strong>Issue Key:</strong> {jiraInfo.issueKey}</p>
            <p><strong>Issue Type:</strong> {jiraInfo.issueType}</p>
            <p><strong>Project Key:</strong> {jiraInfo.projectKey}</p>
            <p><strong>Summary:</strong> {jiraInfo.summary}</p>
            <p><strong>Description:</strong> {jiraInfo.description}</p>
            <p><strong>SQL Statement:</strong> {jiraInfo.sqlStatement}</p>
            <p><strong>Database:</strong> {jiraInfo.database}</p>
            <p><strong>Status:</strong> {jiraInfo.status}</p>
            <p><strong>Bytebase Issue Link:</strong> {renderBytebaseLink(jiraInfo.bytebaseIssueLink)}</p>
          </div>
        )}

        {bytebaseInfo && (
          <div className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4">
            <h3 className="text-xl font-semibold mb-4">Last changed Bytebase Issue</h3>
            <p><strong>Project Name:</strong> {bytebaseInfo.projectName}</p>
            <p><strong>Issue Name:</strong> {bytebaseInfo.issueName}</p>
            <p><strong>Issue Title:</strong> {bytebaseInfo.issueTitle}</p>
            <p><strong>Issue Description:</strong> {bytebaseInfo.issueDescription}</p>
            <p><strong>Issue Status:</strong> {bytebaseInfo.issueStatus}</p>
          </div>
        )}
      </div>

      {!jiraInfo && !bytebaseInfo && (
        <p className="text-gray-500">No webhook information available yet.</p>
      )}

      <p className="text-sm text-gray-600">
        Last updated: {lastUpdated ? lastUpdated.toLocaleString() : 'Never'}
      </p>
    </div>
  );
}
