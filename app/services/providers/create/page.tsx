import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import ServiceProviderCreationWizard from "./wizard/ServiceProviderCreationWizard";

export default async function CreateProviderPage({
  searchParams
}: {
  searchParams: Promise<{ admin?: string }>
}) {
  const session = await auth();
  if (!session?.user?.id) redirect('/signin');
  const params = await searchParams;
  const isAdmin = session.user.roles?.includes('admin') && params.admin === 'true';

  return (
    <ServiceProviderCreationWizard isAdmin={!!isAdmin} />
  );
}










