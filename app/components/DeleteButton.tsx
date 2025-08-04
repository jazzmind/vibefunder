'use client';

interface DeleteButtonProps {
  confirmMessage: string;
  children: React.ReactNode;
  className?: string;
}

export function DeleteButton({ confirmMessage, children, className }: DeleteButtonProps) {
  const handleClick = (e: React.MouseEvent) => {
    if (!confirm(confirmMessage)) {
      e.preventDefault();
    }
  };

  return (
    <button 
      type="submit" 
      className={className}
      onClick={handleClick}
    >
      {children}
    </button>
  );
}