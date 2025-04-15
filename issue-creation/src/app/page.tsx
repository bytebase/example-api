import AddIssueForm from '@/components/add-issue-form';
import { generateToken, fetchData } from '@/app/api/utils';

export default async function Home() {
  const token = await generateToken();
  const allProjectData = await fetchData(`${process.env.NEXT_PUBLIC_BB_HOST}/v1/projects`, token);

  return (
    <main className="flex flex-col w-full p-10 items-center">
      <AddIssueForm allProjects={allProjectData.projects} />
    </main>
  );
}