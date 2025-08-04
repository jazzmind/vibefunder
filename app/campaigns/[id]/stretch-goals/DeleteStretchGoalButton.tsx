'use client';

interface DeleteStretchGoalButtonProps {
  stretchGoalId: string;
  deleteStretchGoal: (formData: FormData) => void;
}

export function DeleteStretchGoalButton({ stretchGoalId, deleteStretchGoal }: DeleteStretchGoalButtonProps) {
  const handleClick = (e: React.MouseEvent) => {
    if (!confirm('Are you sure you want to delete this stretch goal?')) {
      e.preventDefault();
    }
  };

  return (
    <form action={deleteStretchGoal} className="ml-4">
      <input type="hidden" name="stretchGoalId" value={stretchGoalId} />
      <button 
        type="submit"
        className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
        onClick={handleClick}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
    </form>
  );
}