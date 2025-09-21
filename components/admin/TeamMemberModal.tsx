'use client';

import { useRef } from 'react';

interface TeamMemberModalProps {
  memberId: string;
  memberName: string;
  memberEmail: string;
  currentRole: string;
  updateMemberRole: (formData: FormData) => Promise<void>;
}

export function TeamMemberModal({ 
  memberId, 
  memberName, 
  memberEmail, 
  currentRole, 
  updateMemberRole 
}: TeamMemberModalProps) {
  const modalRef = useRef<HTMLDialogElement>(null);

  const openModal = () => {
    modalRef.current?.showModal();
  };

  const closeModal = () => {
    modalRef.current?.close();
  };

  return (
    <>
      <button 
        type="button"
        className="btn-secondary text-sm px-3 py-1"
        onClick={openModal}
      >
        Edit
      </button>

      <dialog ref={modalRef} className="modal">
        <div className="modal-box">
          <h3 className="font-bold text-lg mb-4">Edit Team Member</h3>
          <form action={updateMemberRole} className="space-y-4">
            <input type="hidden" name="memberId" value={memberId} />
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Member
              </label>
              <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <p className="font-medium text-gray-900 dark:text-white">{memberName || memberEmail}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">{memberEmail}</p>
              </div>
            </div>

            <div>
              <label htmlFor={`role-${memberId}`} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Role
              </label>
              <select 
                id={`role-${memberId}`}
                name="role" 
                defaultValue={currentRole}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand focus:border-brand outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="member">Member</option>
                <option value="admin">Admin</option>
                <option value="lead">Lead</option>
              </select>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Admins can manage organization settings and team members
              </p>
            </div>

            <div className="modal-action">
              <button type="submit" className="btn btn-primary">Save Changes</button>
              <button 
                type="button" 
                className="btn"
                onClick={closeModal}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </dialog>
    </>
  );
}
