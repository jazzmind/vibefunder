'use client';

interface DeleteButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  confirmMessage: string;
  children: React.ReactNode;
}

export function DeleteButton({ 
  confirmMessage, 
  children, 
  className,
  onClick,
  ...props 
}: DeleteButtonProps) {
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    try {
      // Check if window.confirm is available (for testing environments)
      if (typeof window !== 'undefined' && typeof window.confirm === 'function') {
        if (!window.confirm(confirmMessage)) {
          e.preventDefault();
          return;
        }
      }
      
      // Call the original onClick handler if provided
      if (onClick) {
        onClick(e);
      }
    } catch (error) {
      // Handle any errors gracefully
      console.warn('DeleteButton: Error in click handler:', error);
      e.preventDefault();
    }
  };

  return (
    <button 
      type="submit" 
      className={className}
      onClick={handleClick}
      {...props}
    >
      {children}
    </button>
  );
}