"use client";

import { useState } from "react";
import { v4 } from "uuid";
import { createIssueWorkflow } from '../utils/issueCreation'; // Add this import

export default function AddIssueForm({ allProjects }: { allProjects: any[] }) {
    const [project, setProject] = useState('');
    const [databases, setDatabases] = useState<any[]>([]);
    const [database, setDatabase] = useState('');
    const [SQL, setSQL] = useState('');
    const [createdIssueUID, setCreatedIssueUID] = useState('');
    const [checkResult, setCheckResult] = useState<any>(null);
    const [refreshedIssueStatus, setRefreshedIssueStatus] = useState('OPEN');
    const [message, setMessage] = useState<string | null>(null);

    const handleSelectProject = async (e: React.ChangeEvent<HTMLSelectElement>) => {
        const selectedProject = e.target.value;

        //selectedProject is like this: projects/project-sample
        //we need to remove the 'projects/' part
        const projectId = selectedProject.split('/')[1];

        setProject(selectedProject);
        setDatabase('');
        
        if (selectedProject) {
            try {
                const response = await fetch(`/api/databases/${encodeURIComponent(projectId)}`);
                const data = await response.json();
                setDatabases(data.databases || []);
            } catch (error) {
                console.error("Error fetching databases:", error);
                setDatabases([]);
            }
        } else {
            setDatabases([]);
        }
    }

    const refreshIssue = async () => {

        const refreshedIssue = await fetch('/api/issues/'+encodeURIComponent(project)+'/'+createdIssueUID, {
            method: 'GET'
        });
     
        const refreshedIssueData = await refreshedIssue.json();
        console.log("--------- refreshedIssueData ----------", refreshedIssueData);
        setRefreshedIssueStatus(refreshedIssueData.status);
    }

    const handleCheck = async (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();

        if(!SQL || !project || !database) return;

        console.log("handleCheck", SQL, database);

            /**
         * Create a check
         */
            let newCheck = {
                name: database,
                statement: SQL
            };
    
            const createdCheck = await fetch('/api/checks/', {
                method: 'POST',
                body:JSON.stringify(newCheck)
            });

            const createdCheckData = await createdCheck.json();
            console.log("--------- createdCheckData ----------",createdCheckData);

            setCheckResult(createdCheckData);     
    }

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if(!SQL || !project || !database) return;

        console.log("handleSubmit");
        
        try {
            const result = await createIssueWorkflow(project, database, SQL);
            if (result.success) {
                setMessage(result.message);
                setCreatedIssueUID(result.issueData.uid);
                setRefreshedIssueStatus('OPEN');
            } else {
                setMessage(`Error: ${result.message}`);
            }
        } catch (error) {
            console.error("Error creating issue:", error);
            setMessage("An unexpected error occurred while creating the issue.");
        }
    }

    return (
        <form onSubmit={handleSubmit} className="md:w-1/2 sm:w-full flex gap-3 flex-col">

        <div className="text-lg leading-loose font-bold">Add an issue to Bytebase Console</div>
        
        <select name="project" id="project" value={project} onChange={handleSelectProject}
        className="w-full rounded-md border-0 py-1.5 px-2 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600">
        <option value="">-- Please select a project --</option>
        {allProjects.map((item, index) => {
                if (item.name === 'projects/default') {
                    return null;
                }
                return <option key={index} value={item.name}>{item.title}</option>
        })}
        </select>

        <select name="database" id="database" value={database} onChange={(e) => setDatabase(e.target.value)}
        className="w-full rounded-md border-0 py-1.5 px-2 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600">
        <option value="">-- Please select a database --</option>
        {databases.map((item, index) => (
            <option key={index} value={item.name}>{item.name}</option>
        ))}
        </select>
        <textarea name="sql" 
        className="w-full rounded-md  border-0 py-1.5 px-2 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600"
            cols={20} rows={3} 
            onChange={e => setSQL(e.target.value)}
            value={SQL} placeholder="Input your SQL here, e.g. ALTER TABLE ..." />
        


        <div className="flex flex-col">
        <button type="button" className="rounded-md bg-yellow-500  px-3 py-2 text-sm font-semibold text-white shadow-sm" onClick={handleCheck}>Run SQL Review only</button>
        {checkResult && checkResult.advices && checkResult.advices.length > 0 && 
        <ul className="bg-yellow-100">
            {checkResult.advices.map((subject, index) => (
                  <li key={index} className="py-4">{index} {JSON.stringify(subject)}</li>
            ))}
        </ul>}
        </div>

          <button type="submit"
          className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          >Create New Issue</button>

            {message && (
                <div className={`p-4 rounded-md ${message.startsWith('Error') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                    {message}
                </div>
            )}

        {createdIssueUID && 
        
        <div className="flex">
             
            <a href={process.env.NEXT_PUBLIC_BB_HOST+"/issue/"+createdIssueUID} target="_blank"
        className="flex-1 text-left rounded-md px-3 py-2 text-indigo-500 hover:underline">👉 View Issue {createdIssueUID } in Bytebase [{refreshedIssueStatus}]</a>
            <button type="button" onClick={() => refreshIssue(createdIssueUID)}
            className="flex-none rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
             >Refresh Status</button>
       
        </div>
        }
        </form>
        
    )
}