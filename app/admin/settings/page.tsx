'use client';

import { useState, useEffect } from 'react';

interface AdminSettings {
  id: string;
  signupsEnabled: boolean;
  organizationApprovalRequired: boolean;
  updatedAt: string;
}

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<AdminSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/admin/settings');
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
      } else {
        setError('Failed to load settings');
      }
    } catch (error) {
      setError('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!settings) return;
    
    setSaving(true);
    setError('');
    setMessage('');

    try {
      const response = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          signupsEnabled: settings.signupsEnabled,
          organizationApprovalRequired: settings.organizationApprovalRequired,
        }),
      });

      if (response.ok) {
        const updated = await response.json();
        setSettings(updated);
        setMessage('Settings saved successfully');
      } else {
        setError('Failed to save settings');
      }
    } catch (error) {
      setError('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="px-4 sm:px-0">
        <div className="flex items-center justify-center py-12">
          <div className="text-gray-500">Loading settings...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-0">
      <div className="md:grid md:grid-cols-3 md:gap-6">
        <div className="md:col-span-1">
          <div className="px-4 sm:px-0">
            <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-white">
              Platform Settings
            </h3>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
              Control access to the platform and manage registration requirements.
            </p>
          </div>
        </div>

        <div className="mt-5 md:mt-0 md:col-span-2">
          <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              {error && (
                <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                </div>
              )}

              {message && (
                <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <p className="text-sm text-green-600 dark:text-green-400">{message}</p>
                </div>
              )}

              <div className="space-y-6">
                <div className="flex items-start">
                  <div className="flex items-center h-5">
                    <input
                      id="signups-enabled"
                      type="checkbox"
                      checked={settings?.signupsEnabled || false}
                      onChange={(e) => 
                        settings && setSettings({ ...settings, signupsEnabled: e.target.checked })
                      }
                      className="w-4 h-4 text-brand border-gray-300 rounded focus:ring-brand focus:ring-2"
                    />
                  </div>
                  <div className="ml-3 text-sm">
                    <label htmlFor="signups-enabled" className="font-medium text-gray-700 dark:text-gray-300">
                      Enable user signups
                    </label>
                    <p className="text-gray-500 dark:text-gray-400">
                      When disabled, new users will be directed to join the waitlist instead of signing up directly.
                    </p>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="flex items-center h-5">
                    <input
                      id="org-approval-required"
                      type="checkbox"
                      checked={settings?.organizationApprovalRequired || false}
                      onChange={(e) => 
                        settings && setSettings({ ...settings, organizationApprovalRequired: e.target.checked })
                      }
                      className="w-4 h-4 text-brand border-gray-300 rounded focus:ring-brand focus:ring-2"
                    />
                  </div>
                  <div className="ml-3 text-sm">
                    <label htmlFor="org-approval-required" className="font-medium text-gray-700 dark:text-gray-300">
                      Require organization approval
                    </label>
                    <p className="text-gray-500 dark:text-gray-400">
                      When enabled, organizations must be approved by an admin before they can create campaigns.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="btn"
                >
                  {saving ? 'Saving...' : 'Save Settings'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}