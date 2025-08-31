'use client';

interface ConfirmButtonProps {
  children: React.ReactNode;
  confirmMessage: string;
  className?: string;
}

export function ConfirmButton({ 
  children,
  confirmMessage, 
  className
}: ConfirmButtonProps) {
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