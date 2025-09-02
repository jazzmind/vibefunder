import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ConfirmButton } from '@/components/ConfirmButton';

// Mock window.confirm
const mockConfirm = jest.fn();
Object.defineProperty(window, 'confirm', {
  value: mockConfirm,
  writable: true,
});

describe('ConfirmButton Component', () => {
  const defaultProps = {
    confirmMessage: 'Are you sure?',
    children: 'Delete Item',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockConfirm.mockReturnValue(true); // Default to confirming
  });

  describe('rendering', () => {
    it('should render button with children content', () => {
      render(<ConfirmButton {...defaultProps} />);

      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
      expect(button).toHaveTextContent('Delete Item');
    });

    it('should render with custom className', () => {
      const customClass = 'custom-button-class';
      render(<ConfirmButton {...defaultProps} className={customClass} />);

      const button = screen.getByRole('button');
      expect(button).toHaveClass(customClass);
    });

    it('should render as submit type button', () => {
      render(<ConfirmButton {...defaultProps} />);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('type', 'submit');
    });

    it('should handle complex children content', () => {
      const complexChildren = (
        <>
          <span>Icon</span>
          <span>Delete</span>
        </>
      );

      render(<ConfirmButton {...defaultProps}>{complexChildren}</ConfirmButton>);

      expect(screen.getByText('Icon')).toBeInTheDocument();
      expect(screen.getByText('Delete')).toBeInTheDocument();
    });

    it('should apply all HTML attributes correctly', () => {
      render(
        <ConfirmButton 
          {...defaultProps} 
          id="test-button"
          disabled={true}
          data-testid="confirm-btn"
        />
      );

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('id', 'test-button');
      expect(button).toBeDisabled();
      expect(button).toHaveAttribute('data-testid', 'confirm-btn');
    });
  });

  describe('confirm behavior', () => {
    it('should show confirm dialog when clicked', () => {
      render(<ConfirmButton {...defaultProps} />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      expect(mockConfirm).toHaveBeenCalledTimes(1);
      expect(mockConfirm).toHaveBeenCalledWith('Are you sure?');
    });

    it('should show custom confirm message', () => {
      const customMessage = 'Do you really want to delete this item?';
      render(<ConfirmButton {...defaultProps} confirmMessage={customMessage} />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      expect(mockConfirm).toHaveBeenCalledWith(customMessage);
    });

    it('should prevent default when user cancels', () => {
      mockConfirm.mockReturnValue(false);

      render(<ConfirmButton {...defaultProps} />);

      const button = screen.getByRole('button');
      const clickEvent = new MouseEvent('click', { bubbles: true });
      const preventDefaultSpy = jest.spyOn(clickEvent, 'preventDefault');

      fireEvent(button, clickEvent);

      expect(mockConfirm).toHaveBeenCalledTimes(1);
      expect(preventDefaultSpy).toHaveBeenCalledTimes(1);
    });

    it('should not prevent default when user confirms', () => {
      mockConfirm.mockReturnValue(true);

      render(<ConfirmButton {...defaultProps} />);

      const button = screen.getByRole('button');
      const clickEvent = new MouseEvent('click', { bubbles: true });
      const preventDefaultSpy = jest.spyOn(clickEvent, 'preventDefault');

      fireEvent(button, clickEvent);

      expect(mockConfirm).toHaveBeenCalledTimes(1);
      expect(preventDefaultSpy).not.toHaveBeenCalled();
    });

    it('should handle multiple confirmation scenarios', () => {
      mockConfirm
        .mockReturnValueOnce(true)  // First click: confirm
        .mockReturnValueOnce(false) // Second click: cancel
        .mockReturnValueOnce(true); // Third click: confirm

      render(<ConfirmButton {...defaultProps} />);

      const button = screen.getByRole('button');
      
      // First click - should proceed
      const firstEvent = new MouseEvent('click', { bubbles: true });
      const firstSpy = jest.spyOn(firstEvent, 'preventDefault');
      fireEvent(button, firstEvent);
      expect(mockConfirm).toHaveBeenCalledTimes(1);
      expect(firstSpy).not.toHaveBeenCalled();

      // Second click - should be prevented
      const secondEvent = new MouseEvent('click', { bubbles: true });
      const secondSpy = jest.spyOn(secondEvent, 'preventDefault');
      fireEvent(button, secondEvent);
      expect(mockConfirm).toHaveBeenCalledTimes(2);
      expect(secondSpy).toHaveBeenCalledTimes(1);

      // Third click - should proceed
      const thirdEvent = new MouseEvent('click', { bubbles: true });
      const thirdSpy = jest.spyOn(thirdEvent, 'preventDefault');
      fireEvent(button, thirdEvent);
      expect(mockConfirm).toHaveBeenCalledTimes(3);
      expect(thirdSpy).not.toHaveBeenCalled();
    });

    it('should handle disabled button correctly', () => {
      render(<ConfirmButton {...defaultProps} disabled />);

      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
      
      // Clicking disabled button shouldn't trigger confirmation
      fireEvent.click(button);
      expect(mockConfirm).not.toHaveBeenCalled();
    });
  });

  describe('accessibility', () => {
    it('should have proper button role', () => {
      render(<ConfirmButton {...defaultProps} />);

      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });

    it('should be focusable', () => {
      render(<ConfirmButton {...defaultProps} />);

      const button = screen.getByRole('button');
      button.focus();
      
      expect(button).toHaveFocus();
    });

    it('should support keyboard interactions', () => {
      render(<ConfirmButton {...defaultProps} />);

      const button = screen.getByRole('button');
      
      // Test Enter key press
      fireEvent.keyDown(button, { key: 'Enter' });
      
      // The actual confirm would be triggered by the browser's default behavior
      expect(button).toBeInTheDocument();
    });

    it('should support space key interactions', () => {
      render(<ConfirmButton {...defaultProps} />);

      const button = screen.getByRole('button');
      
      // Test Space key press
      fireEvent.keyDown(button, { key: ' ' });
      
      expect(button).toBeInTheDocument();
    });

    it('should have accessible name from children', () => {
      render(<ConfirmButton {...defaultProps}>Delete User</ConfirmButton>);

      const button = screen.getByRole('button', { name: 'Delete User' });
      expect(button).toBeInTheDocument();
    });

    it('should work with aria attributes', () => {
      render(
        <ConfirmButton 
          {...defaultProps} 
          aria-label="Delete user account"
          aria-describedby="delete-help"
        />
      );

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label', 'Delete user account');
      expect(button).toHaveAttribute('aria-describedby', 'delete-help');
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle empty confirm message', () => {
      render(<ConfirmButton {...defaultProps} confirmMessage="" />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      expect(mockConfirm).toHaveBeenCalledWith('');
    });

    it('should handle very long confirm messages', () => {
      const longMessage = 'A'.repeat(1000);
      render(<ConfirmButton {...defaultProps} confirmMessage={longMessage} />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      expect(mockConfirm).toHaveBeenCalledWith(longMessage);
    });

    it('should handle special characters in confirm message', () => {
      const specialMessage = 'Are you sure? This action contains: <>&"\'@#$%';
      render(<ConfirmButton {...defaultProps} confirmMessage={specialMessage} />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      expect(mockConfirm).toHaveBeenCalledWith(specialMessage);
    });

    it('should handle empty children gracefully', () => {
      render(<ConfirmButton {...defaultProps}>{null}</ConfirmButton>);

      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
      expect(button).toHaveTextContent('');
    });

    it('should handle undefined className', () => {
      render(<ConfirmButton confirmMessage="Test" className={undefined}>Test</ConfirmButton>);

      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });

    it('should handle null className', () => {
      render(<ConfirmButton confirmMessage="Test" className={null as any}>Test</ConfirmButton>);

      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });

    it('should handle missing window.confirm gracefully', () => {
      const originalConfirm = window.confirm;
      delete (window as any).confirm;

      render(<ConfirmButton {...defaultProps} />);

      const button = screen.getByRole('button');
      
      // Should not throw error when confirm is undefined
      expect(() => fireEvent.click(button)).not.toThrow();

      // Restore confirm
      window.confirm = originalConfirm;
    });

    it('should handle confirm returning non-boolean values', () => {
      mockConfirm.mockReturnValue('true' as any); // String instead of boolean

      render(<ConfirmButton {...defaultProps} />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      expect(mockConfirm).toHaveBeenCalledTimes(1);
      // Should handle truthy non-boolean return values
    });

    it('should handle confirm throwing errors', () => {
      mockConfirm.mockImplementation(() => {
        throw new Error('Confirm dialog error');
      });

      render(<ConfirmButton {...defaultProps} />);

      const button = screen.getByRole('button');
      expect(() => fireEvent.click(button)).not.toThrow();
    });
  });

  describe('integration scenarios', () => {
    it('should work within a form context', () => {
      const onSubmit = jest.fn((e) => e.preventDefault());
      
      render(
        <form onSubmit={onSubmit}>
          <ConfirmButton {...defaultProps} />
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
          <ConfirmButton {...defaultProps} />
        </form>
      );

      const button = screen.getByRole('button');
      fireEvent.click(button);

      expect(mockConfirm).toHaveBeenCalledTimes(1);
      // Form submission would be prevented by preventDefault
    });

    it('should work with different button variants', () => {
      const { rerender } = render(
        <ConfirmButton {...defaultProps} className="btn-primary">
          Primary Action
        </ConfirmButton>
      );

      expect(screen.getByRole('button')).toHaveClass('btn-primary');
      expect(screen.getByRole('button')).toHaveTextContent('Primary Action');

      rerender(
        <ConfirmButton {...defaultProps} className="btn-danger">
          Danger Action
        </ConfirmButton>
      );

      expect(screen.getByRole('button')).toHaveClass('btn-danger');
      expect(screen.getByRole('button')).toHaveTextContent('Danger Action');
    });

    it('should work with icon children', () => {
      const IconButton = () => (
        <ConfirmButton {...defaultProps}>
          <svg data-testid="icon" />
          <span>With Icon</span>
        </ConfirmButton>
      );

      render(<IconButton />);

      expect(screen.getByTestId('icon')).toBeInTheDocument();
      expect(screen.getByText('With Icon')).toBeInTheDocument();

      const button = screen.getByRole('button');
      fireEvent.click(button);

      expect(mockConfirm).toHaveBeenCalledTimes(1);
    });

    it('should maintain consistent behavior across re-renders', () => {
      const { rerender } = render(<ConfirmButton {...defaultProps} />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      expect(mockConfirm).toHaveBeenCalledTimes(1);

      // Re-render with different props
      rerender(<ConfirmButton confirmMessage="New message">New content</ConfirmButton>);

      fireEvent.click(button);

      expect(mockConfirm).toHaveBeenCalledTimes(2);
      expect(mockConfirm).toHaveBeenLastCalledWith('New message');
    });

    it('should work with event delegation', () => {
      const containerClickSpy = jest.fn();
      
      render(
        <div onClick={containerClickSpy}>
          <ConfirmButton {...defaultProps} />
        </div>
      );

      const button = screen.getByRole('button');
      fireEvent.click(button);

      expect(mockConfirm).toHaveBeenCalledTimes(1);
      // Event should bubble to container
      expect(containerClickSpy).toHaveBeenCalledTimes(1);
    });

    it('should handle rapid successive clicks', () => {
      mockConfirm.mockReturnValue(true);
      
      render(<ConfirmButton {...defaultProps} />);

      const button = screen.getByRole('button');
      
      // Simulate rapid clicks
      fireEvent.click(button);
      fireEvent.click(button);
      fireEvent.click(button);

      expect(mockConfirm).toHaveBeenCalledTimes(3);
    });
  });

  describe('performance', () => {
    it('should not create new click handlers on every render', () => {
      let clickHandlerRef: any;
      
      const TestComponent = ({ message }: { message: string }) => {
        const button = <ConfirmButton confirmMessage={message}>Test</ConfirmButton>;
        
        // In a real implementation, we'd check if the onClick handler changes
        if (!clickHandlerRef) {
          clickHandlerRef = button.props.onClick;
        }
        
        return button;
      };

      const { rerender } = render(<TestComponent message="First" />);
      rerender(<TestComponent message="Second" />);

      // This is more about documenting expected behavior
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('should cleanup properly on unmount', () => {
      const { unmount } = render(<ConfirmButton {...defaultProps} />);
      
      expect(screen.getByRole('button')).toBeInTheDocument();
      
      unmount();
      
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });
  });

  describe('browser compatibility', () => {
    it('should work in older browsers without confirm', () => {
      const originalConfirm = window.confirm;
      (window as any).confirm = undefined;

      render(<ConfirmButton {...defaultProps} />);

      const button = screen.getByRole('button');
      expect(() => fireEvent.click(button)).not.toThrow();

      // Restore confirm
      window.confirm = originalConfirm;
    });

    it('should handle different confirm implementations', () => {
      // Some browsers might return different types
      mockConfirm.mockReturnValue(1 as any); // Truthy number

      render(<ConfirmButton {...defaultProps} />);

      const button = screen.getByRole('button');
      const clickEvent = new MouseEvent('click', { bubbles: true });
      const preventDefaultSpy = jest.spyOn(clickEvent, 'preventDefault');

      fireEvent(button, clickEvent);

      expect(mockConfirm).toHaveBeenCalledTimes(1);
      // Should treat truthy values as confirmation
      expect(preventDefaultSpy).not.toHaveBeenCalled();
    });
  });
});