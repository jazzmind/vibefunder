'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';

interface WaitlistEntry {
  id: string;
  email: string;
  reason: string;
  status: string;
  notes?: string;
  createdAt: string;
  approvedAt?: string;
  approver?: {
    id: string;
    name?: string;
    email: string;
  };
}

interface CustomEmailModal {
  isOpen: boolean;
  recipients: string;
  subject: string;
  content: string;
}

export default function AdminWaitlistPage() {
  const [entries, setEntries] = useState<WaitlistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('pending');
  const [customEmail, setCustomEmail] = useState<CustomEmailModal>({
    isOpen: false,
    recipients: 'pending',
    subject: '',
    content: ''
  });

  useEffect(() => {
    fetchWaitlist();
  }, [filter]);

  const fetchWaitlist = async () => {
    try {
      const response = await fetch(`/api/admin/waitlist?status=${filter}`);
      if (response.ok) {
        const data = await response.json();
        setEntries(data.entries);
      } else {
        setError('Failed to load waitlist');
      }
    } catch (error) {
      setError('Failed to load waitlist');
    } finally {
      setLoading(false);
    }
  };

  const handleApproval = async (id: string, status: 'approved' | 'rejected', notes?: string) => {
    try {
      const response = await fetch('/api/admin/waitlist', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status, notes }),
      });

      if (response.ok) {
        fetchWaitlist();
      } else {
        setError('Failed to update entry');
      }
    } catch (error) {
      setError('Failed to update entry');
    }
  };

  const handleCustomEmail = async () => {
    try {
      const response = await fetch('/api/admin/waitlist/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: customEmail.subject,
          content: customEmail.content,
          recipients: customEmail.recipients,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        alert(`Email sent to ${data.successful} recipients successfully`);
        setCustomEmail({
          isOpen: false,
          recipients: 'pending',
          subject: '',
          content: ''
        });
      } else {
        setError('Failed to send emails');
      }
    } catch (error) {
      setError('Failed to send emails');
    }
  };

  if (loading) {
    return (
      <div className="px-4 sm:px-0">
        <div className="flex items-center justify-center py-12">
          <div className="text-gray-500">Loading waitlist...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-0">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Waitlist Management</h1>
          <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
            Manage user waitlist applications and send custom emails.
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <button
            onClick={() => setCustomEmail({ ...customEmail, isOpen: true })}
            className="btn"
          >
            Send Custom Email
          </button>
        </div>
      </div>

      {error && (
        <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Filter tabs */}
      <div className="mt-6">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="-mb-px flex space-x-8">
            {[
              { key: 'pending', label: 'Pending' },
              { key: 'approved', label: 'Approved' },
              { key: 'rejected', label: 'Rejected' },
              { key: 'all', label: 'All' },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  filter === tab.key
                    ? 'border-brand text-brand'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Waitlist table */}
      <div className="mt-8 bg-white dark:bg-gray-800 shadow-sm rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Reason
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Created
              </th>
              <th className="relative px-6 py-3">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {entries.map((entry) => (
              <tr key={entry.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                  {entry.email}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                  {entry.reason === 'back_campaign' ? 'Back campaigns' : 'Create campaigns'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    entry.status === 'approved' 
                      ? 'bg-green-100 text-green-800' 
                      : entry.status === 'rejected'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {entry.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                  {format(new Date(entry.createdAt), 'MMM d, yyyy')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  {entry.status === 'pending' && (
                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={() => handleApproval(entry.id, 'approved')}
                        className="text-green-600 hover:text-green-900"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleApproval(entry.id, 'rejected')}
                        className="text-red-600 hover:text-red-900"
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {entries.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">No waitlist entries found.</p>
          </div>
        )}
      </div>

      {/* Custom Email Modal */}
      {customEmail.isOpen && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white dark:bg-gray-800">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Send Custom Email
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Recipients
                  </label>
                  <select
                    value={customEmail.recipients}
                    onChange={(e) => setCustomEmail({ ...customEmail, recipients: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-brand focus:border-brand bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="pending">Pending users only</option>
                    <option value="all">All waitlist users</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Subject
                  </label>
                  <input
                    type="text"
                    value={customEmail.subject}
                    onChange={(e) => setCustomEmail({ ...customEmail, subject: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-brand focus:border-brand bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Email subject"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Content
                  </label>
                  <textarea
                    rows={6}
                    value={customEmail.content}
                    onChange={(e) => setCustomEmail({ ...customEmail, content: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-brand focus:border-brand bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Email content"
                  />
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setCustomEmail({ ...customEmail, isOpen: false })}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCustomEmail}
                  disabled={!customEmail.subject || !customEmail.content}
                  className="btn"
                >
                  Send Email
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}