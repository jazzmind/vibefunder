'use client';

import { useEffect, useState } from 'react';

interface User {
  id: string;
  email: string;
  roles: string[];
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    try {
      const response = await fetch('/api/auth/session');
      const data = await response.json();
      setUser(data.user);
    } catch (error) {
      console.error('Session check failed:', error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      await fetch('/api/auth/signout', { method: 'POST' });
      setUser(null);
      window.location.href = '/';
    } catch (error) {
      console.error('Sign out failed:', error);
    }
  };

  return {
    user,
    loading,
    signOut,
    isAuthenticated: !!user,
    isAdmin: user?.roles.includes('admin') || false,
  };
}