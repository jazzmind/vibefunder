'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function WaitlistPage() {
  const [email, setEmail] = useState('');
  const [reason, setReason] = useState('back_campaign');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, reason }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage('Successfully added to waitlist! Check your email for confirmation.');
        setSubmitted(true);
      } else {
        setError(data.error || 'Failed to join waitlist');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="w-20 h-20 mx-auto mb-6 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
              <span className="text-3xl">✅</span>
            </div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              You're on the list!
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              {message}
            </p>
            <div className="space-y-4">
              <Link href="/" className="btn w-full">
                Return Home
              </Link>
              <Link href="/signin" className="btn-secondary w-full">
                Already have an account? Sign In
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-brand/10 rounded-full flex items-center justify-center">
            <span className="text-2xl">📋</span>
          </div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
            Join the VibeFunder Waitlist
          </h2>
          <p className="mt-4 text-gray-600 dark:text-gray-300">
            Get early access to back innovative AI-native software projects and connect with creators building the future.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Email address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand focus:border-brand outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="Enter your email"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              What brings you to VibeFunder?
            </label>
            <div className="space-y-3">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="reason"
                  value="back_campaign"
                  checked={reason === 'back_campaign'}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-4 h-4 text-brand border-gray-300 focus:ring-brand focus:ring-2"
                />
                <span className="ml-3 text-gray-700 dark:text-gray-300">I want to back campaigns</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="reason"
                  value="create_campaign"
                  checked={reason === 'create_campaign'}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-4 h-4 text-brand border-gray-300 focus:ring-brand focus:ring-2"
                />
                <span className="ml-3 text-gray-700 dark:text-gray-300">I want to create campaigns</span>
              </label>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-600 dark:text-red-400">
                {error}
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full btn py-3 text-base font-semibold"
          >
            {loading ? 'Joining waitlist...' : 'Join Waitlist'}
          </button>
        </form>

        {/* Footer */}
        <div className="text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Already have an account?{' '}
            <Link href="/signin" className="text-brand hover:text-brand-dark font-medium">
              Sign in
            </Link>
          </p>
        </div>

        {/* Benefits */}
        <div className="mt-8 p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Why join the waitlist?
          </h3>
          <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
            <li className="flex items-start">
              <span className="text-brand mr-2">✓</span>
              Early access to innovative AI-native projects
            </li>
            <li className="flex items-start">
              <span className="text-brand mr-2">✓</span>
              Connect directly with creators and founding teams
            </li>
            <li className="flex items-start">
              <span className="text-brand mr-2">✓</span>
              Get notified when campaigns launch
            </li>
            <li className="flex items-start">
              <span className="text-brand mr-2">✓</span>
              Priority access to limited backing opportunities
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}