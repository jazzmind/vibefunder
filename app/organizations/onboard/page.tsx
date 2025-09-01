import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import OnboardingWizard from '@/components/service-providers/OnboardingWizard';

export default async function ServiceProviderOnboardingPage() {
  const session = await auth();
  
  if (!session?.user) {
    redirect('/signin?redirect=/service-providers/onboard');
  }

  return (
    <div className="min-h-screen">
      <OnboardingWizard />
    </div>
  );
}
