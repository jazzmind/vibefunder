'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface AdminNavLinkProps {
  href: string;
  icon: string;
  children: React.ReactNode;
}

export function AdminNavLink({ href, icon, children }: AdminNavLinkProps) {
  const pathname = usePathname();
  const isActive = pathname === href || (href !== '/admin' && pathname.startsWith(href));

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'dashboard':
        return (
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z M8 5a2 2 0 012-2h4a2 2 0 012 2v6a2 2 0 01-2 2H10a2 2 0 01-2-2V5z" />
        );
      case 'users':
        return (
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
        );
      case 'building':
        return (
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        );
      case 'megaphone':
        return (
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
        );
      case 'wrench':
        return (
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        );
      case 'cog':
        return (
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        );
      default:
        return (
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        );
    }
  };

  return (
    <Link
      href={href}
      className={`group relative inline-flex items-center px-4 py-3 text-sm font-medium transition-all duration-200 ${
        isActive
          ? 'text-brand dark:text-brand border-brand dark:border-brand bg-brand/5 dark:bg-brand/10'
          : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white border-transparent hover:border-brand/50 dark:hover:border-brand/50'
      }`}
    >
      <svg 
        className={`w-4 h-4 mr-2 transition-transform duration-200 ${
          isActive ? 'scale-110' : 'group-hover:scale-110'
        }`} 
        fill="none" 
        stroke="currentColor" 
        viewBox="0 0 24 24"
      >
        {getIcon(icon)}
      </svg>
      <span className="relative font-medium">
        {children}
        {/* Active indicator */}
        {isActive && (
          <span className="absolute -bottom-3 left-0 w-full h-0.5 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full"></span>
        )}
        {/* Hover indicator */}
        <span className={`absolute -bottom-3 left-0 h-0.5 bg-gradient-to-r from-purple-600/50 to-blue-600/50 transition-all duration-300 ease-out ${
          isActive ? 'w-0' : 'w-0 group-hover:w-full'
        }`}></span>
      </span>
    </Link>
  );
}
