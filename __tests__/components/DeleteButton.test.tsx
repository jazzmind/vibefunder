import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { DeleteButton } from '@/components/DeleteButton';

// Mock window.confirm
const mockConfirm = jest.fn();
Object.defineProperty(window, 'confirm', {
  value: mockConfirm,
  writable: true,
});

describe('DeleteButton Component', () => {
  const defaultProps = {
    confirmMessage: 'Are you sure you want to delete this?',
    children: 'Delete',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockConfirm.mockReturnValue(true); // Default to confirming
  });

  describe('rendering', () => {
    it('should render button with children content', () => {
      render(<DeleteButton {...defaultProps} />);

      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
      expect(button).toHaveTextContent('Delete');
    });

    it('should render with custom className', () => {
      const customClass = 'btn-danger';
      render(<DeleteButton {...defaultProps} className={customClass} />);

      const button = screen.getByRole('button');
      expect(button).toHaveClass(customClass);
    });

    it('should render as submit type button', () => {
      render(<DeleteButton {...defaultProps} />);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('type', 'submit');
    });

    it('should handle complex children content', () => {
      const complexChildren = (
        <>
          <svg data-testid="trash-icon" />
          <span>Delete Item</span>
        </>
      );

      render(<DeleteButton {...defaultProps}>{complexChildren}</DeleteButton>);

      expect(screen.getByTestId('trash-icon')).toBeInTheDocument();
      expect(screen.getByText('Delete Item')).toBeInTheDocument();
    });

    it('should render with undefined className gracefully', () => {
      render(<DeleteButton confirmMessage="Test" className={undefined}>Delete</DeleteButton>);

      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });
  });

  describe('confirmation behavior', () => {
    it('should show confirm dialog when clicked', () => {
      render(<DeleteButton {...defaultProps} />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      expect(mockConfirm).toHaveBeenCalledTimes(1);
      expect(mockConfirm).toHaveBeenCalledWith('Are you sure you want to delete this?');
    });

    it('should show custom confirm message', () => {
      const customMessage = 'This action cannot be undone. Are you sure?';
      render(<DeleteButton {...defaultProps} confirmMessage={customMessage} />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      expect(mockConfirm).toHaveBeenCalledWith(customMessage);
    });

    it('should not prevent default when user confirms', () => {
      mockConfirm.mockReturnValue(true);
      
      render(<DeleteButton {...defaultProps} />);

      const button = screen.getByRole('button');
      const clickEvent = new MouseEvent('click', { bubbles: true });
      const preventDefaultSpy = jest.spyOn(clickEvent, 'preventDefault');

      fireEvent(button, clickEvent);

      expect(mockConfirm).toHaveBeenCalledTimes(1);
      expect(preventDefaultSpy).not.toHaveBeenCalled();
    });

    it('should prevent default when user cancels', () => {
      mockConfirm.mockReturnValue(false);

      render(<DeleteButton {...defaultProps} />);

      const button = screen.getByRole('button');
      const clickEvent = new MouseEvent('click', { bubbles: true });
      const preventDefaultSpy = jest.spyOn(clickEvent, 'preventDefault');

      fireEvent(button, clickEvent);

      expect(mockConfirm).toHaveBeenCalledTimes(1);
      expect(preventDefaultSpy).toHaveBeenCalledTimes(1);
    });

    it('should handle multiple confirm/cancel scenarios', () => {
      mockConfirm
        .mockReturnValueOnce(false) // First click: cancel
        .mockReturnValueOnce(true)  // Second click: confirm
        .mockReturnValueOnce(false); // Third click: cancel

      render(<DeleteButton {...defaultProps} />);

      const button = screen.getByRole('button');
      
      // First click - should be prevented
      const firstClickEvent = new MouseEvent('click', { bubbles: true });
      const firstPreventDefaultSpy = jest.spyOn(firstClickEvent, 'preventDefault');
      fireEvent(button, firstClickEvent);
      
      expect(mockConfirm).toHaveBeenCalledTimes(1);
      expect(firstPreventDefaultSpy).toHaveBeenCalledTimes(1);

      // Second click - should proceed
      const secondClickEvent = new MouseEvent('click', { bubbles: true });
      const secondPreventDefaultSpy = jest.spyOn(secondClickEvent, 'preventDefault');
      fireEvent(button, secondClickEvent);
      
      expect(mockConfirm).toHaveBeenCalledTimes(2);
      expect(secondPreventDefaultSpy).not.toHaveBeenCalled();

      // Third click - should be prevented again
      const thirdClickEvent = new MouseEvent('click', { bubbles: true });
      const thirdPreventDefaultSpy = jest.spyOn(thirdClickEvent, 'preventDefault');
      fireEvent(button, thirdClickEvent);
      
      expect(mockConfirm).toHaveBeenCalledTimes(3);
      expect(thirdPreventDefaultSpy).toHaveBeenCalledTimes(1);
    });

    it('should handle rapid successive clicks', () => {
      mockConfirm.mockReturnValue(true);
      
      render(<DeleteButton {...defaultProps} />);

      const button = screen.getByRole('button');
      
      // Simulate rapid clicks
      fireEvent.click(button);
      fireEvent.click(button);
      fireEvent.click(button);

      expect(mockConfirm).toHaveBeenCalledTimes(3);
    });
  });

  describe('accessibility', () => {
    it('should have proper button role', () => {
      render(<DeleteButton {...defaultProps} />);

      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });

    it('should be focusable', () => {
      render(<DeleteButton {...defaultProps} />);

      const button = screen.getByRole('button');
      button.focus();
      
      expect(button).toHaveFocus();
    });

    it('should support keyboard interactions', () => {
      render(<DeleteButton {...defaultProps} />);

      const button = screen.getByRole('button');
      
      // Test Enter key press
      fireEvent.keyDown(button, { key: 'Enter' });
      
      // The actual confirm would be triggered by the browser's default behavior
      expect(button).toBeInTheDocument();
    });

    it('should support space key interactions', () => {
      render(<DeleteButton {...defaultProps} />);

      const button = screen.getByRole('button');
      
      // Test Space key press
      fireEvent.keyDown(button, { key: ' ' });
      
      expect(button).toBeInTheDocument();
    });

    it('should have proper button type for form submission', () => {
      render(<DeleteButton {...defaultProps} />);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('type', 'submit');
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle empty confirm message', () => {
      render(<DeleteButton {...defaultProps} confirmMessage="" />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      expect(mockConfirm).toHaveBeenCalledWith('');
    });

    it('should handle very long confirm messages', () => {
      const longMessage = 'A'.repeat(1000);
      render(<DeleteButton {...defaultProps} confirmMessage={longMessage} />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      expect(mockConfirm).toHaveBeenCalledWith(longMessage);
    });

    it('should handle special characters in confirm message', () => {
      const specialMessage = 'Delete "Item #1" & confirm <action>?';
      render(<DeleteButton {...defaultProps} confirmMessage={specialMessage} />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      expect(mockConfirm).toHaveBeenCalledWith(specialMessage);
    });

    it('should handle null children gracefully', () => {
      render(<DeleteButton {...defaultProps}>{null}</DeleteButton>);

      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
      expect(button).toHaveTextContent('');
    });

    it('should handle empty string children', () => {
      render(<DeleteButton {...defaultProps}>{''}</DeleteButton>);

      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
      expect(button).toHaveTextContent('');
    });

    it('should handle numeric children', () => {
      render(<DeleteButton {...defaultProps}>{0}</DeleteButton>);

      const button = screen.getByRole('button');
      expect(button).toHaveTextContent('0');
    });

    it('should handle boolean children', () => {
      render(<DeleteButton {...defaultProps}>{false}</DeleteButton>);

      const button = screen.getByRole('button');
      expect(button).toHaveTextContent('');
    });
  });

  describe('form integration', () => {
    it('should work within a form context', () => {
      const onSubmit = jest.fn(e => e.preventDefault());
      
      render(
        <form onSubmit={onSubmit}>
          <DeleteButton {...defaultProps} />
        </form>
      );

      const button = screen.getByRole('button');
      fireEvent.click(button);

      expect(mockConfirm).toHaveBeenCalledTimes(1);
    });

    it('should prevent form submission when user cancels', () => {
      mockConfirm.mockReturnValue(false);
      const onSubmit = jest.fn();
      
      render(
        <form onSubmit={onSubmit}>
          <DeleteButton {...defaultProps} />
        </form>
      );

      const button = screen.getByRole('button');
      fireEvent.click(button);

      expect(mockConfirm).toHaveBeenCalledTimes(1);
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('should allow form submission when user confirms', () => {
      mockConfirm.mockReturnValue(true);
      const onSubmit = jest.fn(e => e.preventDefault());
      
      render(
        <form onSubmit={onSubmit}>
          <DeleteButton {...defaultProps} />
        </form>
      );

      const button = screen.getByRole('button');
      fireEvent.click(button);

      expect(mockConfirm).toHaveBeenCalledTimes(1);
      // Form submission would be allowed (preventDefault not called on click)
    });
  });

  describe('styling and CSS classes', () => {
    it('should apply multiple CSS classes correctly', () => {
      const multipleClasses = 'btn btn-danger btn-sm';
      render(<DeleteButton {...defaultProps} className={multipleClasses} />);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('btn', 'btn-danger', 'btn-sm');
    });

    it('should handle conditional CSS classes', () => {
      const conditionalClass = true ? 'enabled' : 'disabled';
      render(<DeleteButton {...defaultProps} className={conditionalClass} />);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('enabled');
    });

    it('should work without any className', () => {
      render(
        <DeleteButton confirmMessage="Delete this?">
          Delete
        </DeleteButton>
      );

      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
      expect(button).toHaveAttribute('type', 'submit');
    });
  });

  describe('browser compatibility', () => {
    it('should handle missing confirm function gracefully', () => {
      const originalConfirm = window.confirm;
      delete (window as any).confirm;

      render(<DeleteButton {...defaultProps} />);

      const button = screen.getByRole('button');
      
      // Should not throw error when confirm is undefined
      expect(() => fireEvent.click(button)).not.toThrow();

      // Restore confirm
      window.confirm = originalConfirm;
    });

    it('should handle confirm returning non-boolean values', () => {
      mockConfirm.mockReturnValue('true' as any); // String instead of boolean

      render(<DeleteButton {...defaultProps} />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      expect(mockConfirm).toHaveBeenCalledTimes(1);
      // Should handle truthy non-boolean return values
    });

    it('should handle confirm returning null or undefined', () => {
      mockConfirm.mockReturnValue(null as any);

      render(<DeleteButton {...defaultProps} />);

      const button = screen.getByRole('button');
      const clickEvent = new MouseEvent('click', { bubbles: true });
      const preventDefaultSpy = jest.spyOn(clickEvent, 'preventDefault');

      fireEvent(button, clickEvent);

      expect(mockConfirm).toHaveBeenCalledTimes(1);
      // null should be treated as falsy, so preventDefault should be called
      expect(preventDefaultSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('component reusability', () => {
    it('should work with different button variants', () => {
      const { rerender } = render(
        <DeleteButton confirmMessage="Delete this?" className="btn-primary">
          Delete User
        </DeleteButton>
      );

      expect(screen.getByRole('button')).toHaveClass('btn-primary');
      expect(screen.getByRole('button')).toHaveTextContent('Delete User');

      rerender(
        <DeleteButton confirmMessage="Remove this?" className="btn-outline">
          Remove Item
        </DeleteButton>
      );

      expect(screen.getByRole('button')).toHaveClass('btn-outline');
      expect(screen.getByRole('button')).toHaveTextContent('Remove Item');
    });

    it('should maintain state across re-renders', () => {
      const { rerender } = render(<DeleteButton {...defaultProps} />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      expect(mockConfirm).toHaveBeenCalledTimes(1);

      // Re-render with different props
      rerender(<DeleteButton confirmMessage="New message">New content</DeleteButton>);

      fireEvent.click(button);

      expect(mockConfirm).toHaveBeenCalledTimes(2);
      expect(mockConfirm).toHaveBeenLastCalledWith('New message');
    });
  });
});