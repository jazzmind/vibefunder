'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';

interface Organization {
  id: string;
  name: string;
  description?: string;
  website?: string;
  email: string;
  businessType?: string;
  status: string;
  notes?: string;
  createdAt: string;
  approvedAt?: string;
  owner: {
    id: string;
    name?: string;
    email: string;
  };
  approver?: {
    id: string;
    name?: string;
    email: string;
  };
}

export default function AdminOrganizationsPage() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);

  useEffect(() => {
    fetchOrganizations();
  }, [filter]);

  const fetchOrganizations = async () => {
    try {
      const response = await fetch(`/api/admin/organizations?status=${filter}`);
      if (response.ok) {
        const data = await response.json();
        setOrganizations(data.organizations);
      } else {
        setError('Failed to load organizations');
      }
    } catch (error) {
      setError('Failed to load organizations');
    } finally {
      setLoading(false);
    }
  };

  const handleApproval = async (id: string, status: 'approved' | 'rejected', notes?: string) => {
    try {
      const response = await fetch('/api/admin/organizations', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status, notes }),
      });

      if (response.ok) {
        fetchOrganizations();
        setSelectedOrg(null);
      } else {
        setError('Failed to update organization');
      }
    } catch (error) {
      setError('Failed to update organization');
    }
  };

  if (loading) {
    return (
      <div className="px-4 sm:px-0">
        <div className="flex items-center justify-center py-12">
          <div className="text-gray-500">Loading organizations...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-0">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Organization Management</h1>
          <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
            Review and approve organization applications for campaign creation.
          </p>
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
              { key: 'all', label: 'All' },
              { key: 'pending', label: 'Pending' },
              { key: 'approved', label: 'Approved' },
              { key: 'rejected', label: 'Rejected' },
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

      {/* Organizations table */}
      <div className="mt-8 bg-white dark:bg-gray-800 shadow-sm rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Organization
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Owner
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Type
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
            {organizations.map((org) => (
              <tr key={org.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                <td className="px-6 py-4">
                  <div>
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {org.name}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-300 truncate max-w-xs">
                      {org.email}
                    </div>
                    {org.website && (
                      <div className="text-sm text-blue-600 dark:text-blue-400">
                        {org.website}
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                  <div>
                    <div className="font-medium">{org.owner.name || 'No name'}</div>
                    <div>{org.owner.email}</div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                  {org.businessType || 'Not specified'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    org.status === 'approved' 
                      ? 'bg-green-100 text-green-800' 
                      : org.status === 'rejected'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {org.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                  {format(new Date(org.createdAt), 'MMM d, yyyy')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button
                    onClick={() => setSelectedOrg(org)}
                    className="text-brand hover:text-brand/80"
                  >
                    View Details
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {organizations.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">No organizations found.</p>
          </div>
        )}
      </div>

      {/* Organization Details Modal */}
      {selectedOrg && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-3xl shadow-lg rounded-md bg-white dark:bg-gray-800">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Organization Details
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Name
                  </label>
                  <p className="mt-1 text-sm text-gray-900 dark:text-white">{selectedOrg.name}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Email
                  </label>
                  <p className="mt-1 text-sm text-gray-900 dark:text-white">{selectedOrg.email}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Business Type
                  </label>
                  <p className="mt-1 text-sm text-gray-900 dark:text-white">{selectedOrg.businessType || 'Not specified'}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Website
                  </label>
                  <p className="mt-1 text-sm text-gray-900 dark:text-white">{selectedOrg.website || 'Not provided'}</p>
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Description
                  </label>
                  <p className="mt-1 text-sm text-gray-900 dark:text-white">{selectedOrg.description || 'No description provided'}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Owner
                  </label>
                  <p className="mt-1 text-sm text-gray-900 dark:text-white">
                    {selectedOrg.owner.name || 'No name'} ({selectedOrg.owner.email})
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Status
                  </label>
                  <span className={`mt-1 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    selectedOrg.status === 'approved' 
                      ? 'bg-green-100 text-green-800' 
                      : selectedOrg.status === 'rejected'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {selectedOrg.status}
                  </span>
                </div>
              </div>
              
              {selectedOrg.status === 'pending' && (
                <div className="flex justify-end space-x-3 border-t border-gray-200 dark:border-gray-600 pt-4">
                  <button
                    onClick={() => setSelectedOrg(null)}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleApproval(selectedOrg.id, 'rejected')}
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md"
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => handleApproval(selectedOrg.id, 'approved')}
                    className="btn"
                  >
                    Approve
                  </button>
                </div>
              )}
              
              {selectedOrg.status !== 'pending' && (
                <div className="flex justify-end border-t border-gray-200 dark:border-gray-600 pt-4">
                  <button
                    onClick={() => setSelectedOrg(null)}
                    className="btn-secondary"
                  >
                    Close
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}