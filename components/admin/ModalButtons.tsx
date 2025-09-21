'use client';

interface ModalButtonsProps {
  targetModalId: string;
}

export function EditModalButton({ targetModalId }: ModalButtonsProps) {
  const openModal = () => {
    (document.getElementById(targetModalId) as HTMLDialogElement)?.showModal();
  };

  return (
    <button 
      type="button"
      className="btn-secondary text-sm px-3 py-1"
      onClick={openModal}
    >
      Edit
    </button>
  );
}

export function CloseModalButton({ targetModalId }: ModalButtonsProps) {
  const closeModal = () => {
    (document.getElementById(targetModalId) as HTMLDialogElement)?.close();
  };

  return (
    <button 
      type="button" 
      className="btn"
      onClick={closeModal}
    >
      Cancel
    </button>
  );
}
