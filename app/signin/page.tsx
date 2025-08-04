'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { startAuthentication, startRegistration, browserSupportsWebAuthn } from '@simplewebauthn/browser';

type AuthStep = 'email' | 'otp' | 'passkey-setup' | 'passkey-auto' | 'waitlist';

export default function SignIn() {
  const [step, setStep] = useState<AuthStep>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [user, setUser] = useState<any>(null);
  const [hasPasskeys, setHasPasskeys] = useState(false);
  const [signupsEnabled, setSignupsEnabled] = useState(true);
  const [waitlistReason, setWaitlistReason] = useState('back_campaign');

  // Check for existing passkeys and signup status on component mount
  useEffect(() => {
    const checkForPasskeys = () => {
      if (!browserSupportsWebAuthn()) {
        return;
      }

      // Check if user has previously used passkeys on this device
      const hasUsedPasskeys = localStorage.getItem('vibefunder_has_passkeys') === 'true';
      
      if (hasUsedPasskeys) {
        setHasPasskeys(true);
        setStep('passkey-auto');
      }
    };

    const checkSignupStatus = async () => {
      try {
        const response = await fetch('/api/auth/check-signup-status');
        if (response.ok) {
          const data = await response.json();
          setSignupsEnabled(data.signupsEnabled);
        }
      } catch (error) {
        console.error('Error checking signup status:', error);
      }
    };

    // Check immediately on mount
    checkForPasskeys();
    checkSignupStatus();
  }, []);

  // Check if user already has passkeys after OTP login
  const checkUserPasskeys = async (userId: string) => {
    try {
      const response = await fetch('/api/auth/user-passkeys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });
      const data = await response.json();
      return data.hasPasskeys || false;
    } catch (error) {
      console.error('Error checking user passkeys:', error);
      return false;
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // If waitlist is enabled (signups disabled), redirect to waitlist
    if (!signupsEnabled) {
      setStep('waitlist');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(data.message);
        setStep('otp');
      } else {
        setError(data.error || 'Failed to send code');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  const handleWaitlistSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, reason: waitlistReason }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage('Successfully added to waitlist! Check your email for confirmation.');
      } else {
        setError(data.error || 'Failed to join waitlist');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: otp }),
      });

      const data = await response.json();

      if (response.ok) {
        setUser(data.user);
        // Check if user already has passkeys
        const userHasPasskeys = await checkUserPasskeys(data.user.id);
        if (userHasPasskeys) {
          // User already has passkeys, redirect to dashboard
          window.location.href = '/dashboard';
        } else {
          // User doesn't have passkeys, offer to set them up
          setStep('passkey-setup');
        }
      } else {
        setError(data.error || 'Invalid code');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  const handlePasskeyAuth = async () => {
    setLoading(true);
    setError('');

    try {
      // Get authentication options
      const optionsResponse = await fetch('/api/auth/passkey/auth-options', {
        method: 'POST',
      });
      const options = await optionsResponse.json();

      if (!optionsResponse.ok) {
        throw new Error(options.error);
      }

      // Start authentication
      const credential = await startAuthentication(options);

      // Verify authentication
      const response = await fetch('/api/auth/passkey/authenticate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential }),
      });

      const data = await response.json();

      if (response.ok) {
        // Mark that this device has used passkeys
        localStorage.setItem('vibefunder_has_passkeys', 'true');
        window.location.href = '/dashboard';
      } else {
        setError(data.error || 'Passkey authentication failed');
      }
    } catch (err: any) {
      setError(err.message || 'Passkey authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handlePasskeySetup = async () => {
    setLoading(true);
    setError('');

    try {
      // Get registration options
      const optionsResponse = await fetch('/api/auth/passkey/register-options');
      const options = await optionsResponse.json();

      if (!optionsResponse.ok) {
        throw new Error(options.error);
      }

      // Start registration
      const credential = await startRegistration(options);

      // Register passkey
      const response = await fetch('/api/auth/passkey/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential }),
      });

      const data = await response.json();

      if (response.ok) {
        // Mark that this device now has passkeys
        localStorage.setItem('vibefunder_has_passkeys', 'true');
        window.location.href = '/dashboard';
      } else {
        setError(data.error || 'Failed to register passkey');
      }
    } catch (err: any) {
      setError(err.message || 'Passkey setup failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSkipPasskey = () => {
    window.location.href = '/dashboard';
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <Link href="/" className="text-2xl font-bold text-gray-900 dark:text-white">
            VibeFunder<span className="text-brand">.ai</span>
          </Link>
          <h2 className="mt-6 text-3xl font-bold text-gray-900 dark:text-white">
            {step === 'email' && 'Sign in to your account'}
            {step === 'otp' && 'Enter your code'}
            {step === 'passkey-setup' && 'Set up secure sign-in'}
            {step === 'passkey-auto' && 'Sign in with your passkey'}
            {step === 'waitlist' && 'Join our waitlist'}
          </h2>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            {step === 'email' && 'Enter your email to get started'}
            {step === 'otp' && `We sent a 6-digit code to ${email}`}
            {step === 'passkey-setup' && 'Set up a passkey for faster, more secure sign-ins'}
            {step === 'passkey-auto' && 'We detected a passkey on this device. Use it for secure, password-free sign-in.'}
            {step === 'waitlist' && "We're in early access. Join our waitlist to get notified when your account is ready!"}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-8">
          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {message && (
            <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <p className="text-sm text-green-600 dark:text-green-400">{message}</p>
            </div>
          )}

          {step === 'email' && (
            <>
              <div className="mb-6">
                <button
                  onClick={handlePasskeyAuth}
                  disabled={loading}
                  className="w-full btn py-3 text-base font-semibold mb-4"
                >
                  🔐 Sign in with Passkey
                </button>
                
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300 dark:border-gray-600" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">or</span>
                  </div>
                </div>
              </div>

              <form onSubmit={handleEmailSubmit} className="space-y-6">
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

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full btn py-3 text-base font-semibold"
                >
                  {loading ? 'Sending...' : 'Send Code'}
                </button>
              </form>
            </>
          )}

          {step === 'passkey-auto' && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="w-24 h-24 mx-auto mb-6 bg-brand/10 rounded-full flex items-center justify-center">
                  <svg className="w-12 h-12 text-brand" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
                  </svg>
                </div>
              </div>

              <button
                onClick={handlePasskeyAuth}
                disabled={loading}
                className="w-full btn py-4 text-lg font-semibold"
              >
                {loading ? 'Authenticating...' : '🔐 Sign in with Passkey'}
              </button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setStep('email')}
                  className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                >
                  Use email instead
                </button>
              </div>
            </div>
          )}

          {step === 'otp' && (
            <form onSubmit={handleOtpSubmit} className="space-y-6">
              <div>
                <label htmlFor="otp" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  6-digit code
                </label>
                <input
                  id="otp"
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand focus:border-brand outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-center text-2xl font-mono tracking-widest"
                  placeholder="000000"
                  maxLength={6}
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading || otp.length !== 6}
                className="w-full btn py-3 text-base font-semibold"
              >
                {loading ? 'Verifying...' : 'Verify Code'}
              </button>
              
              <button
                type="button"
                onClick={() => setStep('email')}
                className="w-full btn-secondary py-3 text-base font-semibold"
              >
                Back
              </button>
            </form>
          )}

          {step === 'passkey-setup' && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-brand/10 rounded-full flex items-center justify-center">
                  <span className="text-2xl">🔐</span>
                </div>
                <p className="text-gray-600 dark:text-gray-300 mb-6">
                  Set up a passkey to sign in instantly without codes or passwords. 
                  You can use your fingerprint, face, or device PIN.
                </p>
              </div>

              <button
                onClick={handlePasskeySetup}
                disabled={loading}
                className="w-full btn py-3 text-base font-semibold"
              >
                {loading ? 'Setting up...' : 'Set up Passkey'}
              </button>
              
              <button
                onClick={handleSkipPasskey}
                className="w-full btn-secondary py-3 text-base font-semibold"
              >
                Skip for now
              </button>
            </div>
          )}

          {step === 'waitlist' && (
            <form onSubmit={handleWaitlistSubmit} className="space-y-6">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-brand/10 rounded-full flex items-center justify-center">
                  <span className="text-2xl">📋</span>
                </div>
              </div>

              <div>
                <label htmlFor="waitlist-email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Email address
                </label>
                <input
                  id="waitlist-email"
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
                  What do you want to do on VibeFunder?
                </label>
                <div className="space-y-3">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="reason"
                      value="back_campaign"
                      checked={waitlistReason === 'back_campaign'}
                      onChange={(e) => setWaitlistReason(e.target.value)}
                      className="w-4 h-4 text-brand border-gray-300 focus:ring-brand focus:ring-2"
                    />
                    <span className="ml-3 text-gray-700 dark:text-gray-300">I want to back campaigns</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="reason"
                      value="create_campaign"
                      checked={waitlistReason === 'create_campaign'}
                      onChange={(e) => setWaitlistReason(e.target.value)}
                      className="w-4 h-4 text-brand border-gray-300 focus:ring-brand focus:ring-2"
                    />
                    <span className="ml-3 text-gray-700 dark:text-gray-300">I want to create campaigns</span>
                  </label>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full btn py-3 text-base font-semibold"
              >
                {loading ? 'Joining waitlist...' : 'Join Waitlist'}
              </button>
              
              <button
                type="button"
                onClick={() => setStep('email')}
                className="w-full btn-secondary py-3 text-base font-semibold"
              >
                Back
              </button>
            </form>
          )}
        </div>

        <div className="mt-8 text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Don't have an account? You'll create one automatically when you sign in.
          </p>
        </div>
      </div>
    </div>
  );
}