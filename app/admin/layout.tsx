import Link from 'next/link';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { AuthenticatedNav } from '@/components/AuthenticatedNav';
import { AdminNavLink } from '@/components/admin/AdminNavLink';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  
  if (!session?.user?.roles?.includes('admin')) {
    redirect('/signin');
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">      
    {/* Admin Sub-Navigation */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            {/* Admin Brand */}
            <div className="flex items-center space-x-4 py-2">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Site Admin</h1>
                  {/* <p className="text-xs text-gray-500 dark:text-gray-400">Control Panel</p> */}
                </div>
              </div>
            </div>
            
            {/* Quick Actions */}
            {/* <div className="flex items-center space-x-3">
              <Link
                href="/"
                className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to App
              </Link>
            </div> */}
          {/* </div> */}
          
          {/* Navigation Tabs */}
          <div className="flex space-x-1">
            <AdminNavLink href="/admin" icon="dashboard">Dashboard</AdminNavLink>
            <AdminNavLink href="/admin/waitlist" icon="users">Waitlist</AdminNavLink>
            <AdminNavLink href="/admin/organizations" icon="building">Organizations</AdminNavLink>
            <AdminNavLink href="/admin/campaigns" icon="megaphone">Campaigns</AdminNavLink>
            <AdminNavLink href="/admin/services" icon="wrench">Services</AdminNavLink>
            <AdminNavLink href="/admin/settings" icon="cog">Settings</AdminNavLink>
          </div>
          </div>
        </div>
      </div>
      
      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}