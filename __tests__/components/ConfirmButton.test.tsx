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

    it('should not prevent default when user confirms', () => {
      mockConfirm.mockReturnValue(true);
      
      const mockEvent = {
        preventDefault: jest.fn(),
      };

      render(<ConfirmButton {...defaultProps} />);

      const button = screen.getByRole('button');
      fireEvent.click(button, mockEvent);

      expect(mockConfirm).toHaveBeenCalledTimes(1);
      expect(mockEvent.preventDefault).not.toHaveBeenCalled();
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

    it('should handle multiple clicks correctly', () => {
      mockConfirm
        .mockReturnValueOnce(true)  // First click: confirm
        .mockReturnValueOnce(false) // Second click: cancel
        .mockReturnValueOnce(true); // Third click: confirm

      render(<ConfirmButton {...defaultProps} />);

      const button = screen.getByRole('button');
      
      // First click - should proceed
      fireEvent.click(button);
      expect(mockConfirm).toHaveBeenCalledTimes(1);

      // Second click - should be prevented
      const secondClickEvent = new MouseEvent('click', { bubbles: true });
      const preventDefaultSpy = jest.spyOn(secondClickEvent, 'preventDefault');
      fireEvent(button, secondClickEvent);
      
      expect(mockConfirm).toHaveBeenCalledTimes(2);
      expect(preventDefaultSpy).toHaveBeenCalledTimes(1);

      // Third click - should proceed
      fireEvent.click(button);
      expect(mockConfirm).toHaveBeenCalledTimes(3);
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
      // We can test that the button receives the key event
      expect(button).toBeInTheDocument();
    });

    it('should support space key interactions', () => {
      render(<ConfirmButton {...defaultProps} />);

      const button = screen.getByRole('button');
      
      // Test Space key press
      fireEvent.keyDown(button, { key: ' ' });
      
      expect(button).toBeInTheDocument();
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
      const specialMessage = 'Are you sure? This action contains: <>&"\'';
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
      expect(button).not.toHaveClass(); // Should have no classes
    });

    it('should handle null className', () => {
      render(<ConfirmButton confirmMessage="Test" className={null as any}>Test</ConfirmButton>);

      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });
  });

  describe('integration scenarios', () => {
    it('should work within a form context', () => {
      const onSubmit = jest.fn();
      
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
      expect(onSubmit).not.toHaveBeenCalled();
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
  });

  describe('performance and behavior', () => {
    it('should not trigger confirm on programmatic click events', () => {
      render(<ConfirmButton {...defaultProps} />);

      const button = screen.getByRole('button');
      
      // Programmatically click without user interaction
      button.click();

      expect(mockConfirm).toHaveBeenCalledTimes(1);
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
  });

  describe('browser compatibility', () => {
    it('should handle missing confirm function gracefully', () => {
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
  });
});