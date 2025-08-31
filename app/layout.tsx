import "./globals.css";
import Link from "next/link";
import { AuthProvider } from '@/app/providers/AuthProvider';
import { AuthenticatedNav } from '@/components/AuthenticatedNav';

export const metadata = { 
  title: "VibeFunder — Ship the vibe. Not the pitch deck.", 
  description: "VibeFunder is the alternative to venture capital for AI-native micro‑SaaS. Turn demos into dependable software with charter customers who fund the last mile—security, reliability, and compliance." 
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark:[color-scheme:dark]">
      <body className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
        <AuthProvider>
          <header className="sticky top-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between items-center h-16">
                <Link href="/" className="text-xl font-bold text-gray-900 dark:text-white">
                  VibeFunder<span className="text-brand">.ai</span>
                </Link>
                <AuthenticatedNav />
              </div>
            </div>
          </header>
          <main>{children}</main>
          <footer className="bg-gray-900 dark:bg-gray-950 text-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              <div className="flex justify-between items-center">
                <span>© 2025 VibeFunder</span>
                <div className="flex space-x-6">
                  <Link href="#" className="text-gray-400 dark:text-gray-500 hover:text-white transition-colors">Terms</Link>
                  <Link href="#" className="text-gray-400 dark:text-gray-500 hover:text-white transition-colors">Privacy</Link>
                </div>
              </div>
            </div>
          </footer>
        </AuthProvider>
      </body>
    </html>
  );
}
