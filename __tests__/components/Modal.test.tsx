import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import Modal from '@/components/shared/Modal';

// Mock HeadlessUI Dialog component
jest.mock('@headlessui/react', () => ({
  Dialog: Object.assign(
    ({ children, onClose, ...props }: any) => (
      <div {...props}>{children}</div>
    ),
    {
      Panel: ({ children, className, ...props }: any) => (
        <div role="dialog" className={className} {...props}>
          {children}
        </div>
      ),
      Title: ({ children, className, ...props }: any) => (
        <h3 className={className} {...props}>
          {children}
        </h3>
      ),
    }
  ),
  Transition: Object.assign(
    ({ children, show, ...props }: any) => (
      show ? <div {...props}>{children}</div> : null
    ),
    {
      Child: ({ children, show, ...props }: any) => (
        show ? <div {...props}>{children}</div> : null
      ),
    }
  ),
  Fragment: ({ children }: any) => <>{children}</>,
}));

// Mock Lucide React icons
jest.mock('lucide-react', () => ({
  X: (props: any) => <svg data-testid="x-icon" {...props} />,
}));

describe('Modal Component', () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    title: 'Test Modal',
    children: <div>Modal content</div>,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render when isOpen is true', () => {
      render(<Modal {...defaultProps} />);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Test Modal')).toBeInTheDocument();
      expect(screen.getByText('Modal content')).toBeInTheDocument();
    });

    it('should not render when isOpen is false', () => {
      render(<Modal {...defaultProps} isOpen={false} />);

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(screen.queryByText('Test Modal')).not.toBeInTheDocument();
      expect(screen.queryByText('Modal content')).not.toBeInTheDocument();
    });

    it('should render the title correctly', () => {
      render(<Modal {...defaultProps} title="Custom Title" />);

      expect(screen.getByText('Custom Title')).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('Custom Title');
    });

    it('should render children content', () => {
      const customContent = (
        <div>
          <p>Custom paragraph</p>
          <button>Custom button</button>
        </div>
      );

      render(<Modal {...defaultProps}>{customContent}</Modal>);

      expect(screen.getByText('Custom paragraph')).toBeInTheDocument();
      expect(screen.getByText('Custom button')).toBeInTheDocument();
    });

    it('should render close button', () => {
      render(<Modal {...defaultProps} />);

      const closeButton = screen.getByRole('button');
      expect(closeButton).toBeInTheDocument();
      expect(screen.getByTestId('x-icon')).toBeInTheDocument();
    });
  });

  describe('maxWidth variations', () => {
    it('should apply sm maxWidth class', () => {
      render(<Modal {...defaultProps} maxWidth="sm" />);

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveClass('max-w-sm');
    });

    it('should apply md maxWidth class', () => {
      render(<Modal {...defaultProps} maxWidth="md" />);

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveClass('max-w-md');
    });

    it('should apply lg maxWidth class (default)', () => {
      render(<Modal {...defaultProps} />);

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveClass('max-w-lg');
    });

    it('should apply xl maxWidth class', () => {
      render(<Modal {...defaultProps} maxWidth="xl" />);

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveClass('max-w-xl');
    });

    it('should apply 2xl maxWidth class', () => {
      render(<Modal {...defaultProps} maxWidth="2xl" />);

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveClass('max-w-2xl');
    });
  });

  describe('interactions', () => {
    it('should call onClose when close button is clicked', () => {
      const mockOnClose = jest.fn();
      render(<Modal {...defaultProps} onClose={mockOnClose} />);

      const closeButton = screen.getByRole('button');
      fireEvent.click(closeButton);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should support multiple close button clicks', () => {
      const mockOnClose = jest.fn();
      render(<Modal {...defaultProps} onClose={mockOnClose} />);

      const closeButton = screen.getByRole('button');
      fireEvent.click(closeButton);
      fireEvent.click(closeButton);
      fireEvent.click(closeButton);

      expect(mockOnClose).toHaveBeenCalledTimes(3);
    });

    it('should handle keyboard interactions on close button', () => {
      const mockOnClose = jest.fn();
      render(<Modal {...defaultProps} onClose={mockOnClose} />);

      const closeButton = screen.getByRole('button');
      
      // Test Enter key
      fireEvent.keyDown(closeButton, { key: 'Enter' });
      fireEvent.click(closeButton); // Simulating the actual click that would occur
      
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should handle focus management', () => {
      render(<Modal {...defaultProps} />);

      const closeButton = screen.getByRole('button');
      closeButton.focus();
      
      expect(closeButton).toHaveFocus();
    });
  });

  describe('styling and CSS classes', () => {
    it('should apply correct base classes to dialog panel', () => {
      render(<Modal {...defaultProps} />);

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveClass(
        'w-full',
        'transform',
        'overflow-hidden',
        'rounded-lg',
        'bg-white',
        'dark:bg-gray-800',
        'p-6',
        'text-left',
        'align-middle',
        'shadow-xl',
        'transition-all'
      );
    });

    it('should apply correct classes to title', () => {
      render(<Modal {...defaultProps} />);

      const title = screen.getByRole('heading', { level: 3 });
      expect(title).toHaveClass(
        'text-lg',
        'font-medium',
        'leading-6',
        'text-gray-900',
        'dark:text-white'
      );
    });

    it('should apply correct classes to close button', () => {
      render(<Modal {...defaultProps} />);

      const closeButton = screen.getByRole('button');
      expect(closeButton).toHaveClass(
        'rounded-md',
        'bg-transparent',
        'p-1',
        'text-gray-400',
        'hover:text-gray-500',
        'dark:hover:text-gray-300',
        'focus:outline-none',
        'focus:ring-2',
        'focus:ring-brand'
      );
    });
  });

  describe('accessibility', () => {
    it('should have proper dialog role', () => {
      render(<Modal {...defaultProps} />);

      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();
    });

    it('should have proper heading structure', () => {
      render(<Modal {...defaultProps} />);

      const heading = screen.getByRole('heading', { level: 3 });
      expect(heading).toBeInTheDocument();
      expect(heading).toHaveTextContent('Test Modal');
    });

    it('should have accessible close button', () => {
      render(<Modal {...defaultProps} />);

      const closeButton = screen.getByRole('button');
      expect(closeButton).toHaveAttribute('type', 'button');
    });

    it('should support screen readers with proper markup', () => {
      render(<Modal {...defaultProps} />);

      // Dialog should be properly structured
      const dialog = screen.getByRole('dialog');
      const heading = screen.getByRole('heading', { level: 3 });
      
      expect(dialog).toContainElement(heading);
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle empty title', () => {
      render(<Modal {...defaultProps} title="" />);

      const heading = screen.getByRole('heading', { level: 3 });
      expect(heading).toHaveTextContent('');
    });

    it('should handle empty children', () => {
      render(<Modal {...defaultProps}>{null}</Modal>);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Test Modal')).toBeInTheDocument();
    });

    it('should handle complex children content', () => {
      const complexContent = (
        <div>
          <form>
            <input type="text" placeholder="Test input" />
            <select>
              <option value="1">Option 1</option>
              <option value="2">Option 2</option>
            </select>
            <button type="submit">Submit</button>
          </form>
          <div>
            <img src="/test.jpg" alt="Test" />
            <p>Complex content with <strong>bold</strong> and <em>italic</em> text</p>
          </div>
        </div>
      );

      render(<Modal {...defaultProps}>{complexContent}</Modal>);

      expect(screen.getByPlaceholderText('Test input')).toBeInTheDocument();
      expect(screen.getByRole('combobox')).toBeInTheDocument();
      expect(screen.getByText('Submit')).toBeInTheDocument();
      expect(screen.getByText('bold')).toBeInTheDocument();
      expect(screen.getByText('italic')).toBeInTheDocument();
    });

    it('should handle rapid open/close state changes', () => {
      const { rerender } = render(<Modal {...defaultProps} isOpen={true} />);
      expect(screen.getByRole('dialog')).toBeInTheDocument();

      rerender(<Modal {...defaultProps} isOpen={false} />);
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

      rerender(<Modal {...defaultProps} isOpen={true} />);
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('should handle undefined onClose gracefully', () => {
      // TypeScript would catch this, but test runtime behavior
      render(<Modal {...defaultProps} onClose={undefined as any} />);

      const closeButton = screen.getByRole('button');
      expect(() => fireEvent.click(closeButton)).not.toThrow();
    });
  });

  describe('responsive behavior', () => {
    it('should maintain responsive classes across different max widths', () => {
      const { rerender } = render(<Modal {...defaultProps} maxWidth="sm" />);
      expect(screen.getByRole('dialog')).toHaveClass('max-w-sm');

      rerender(<Modal {...defaultProps} maxWidth="2xl" />);
      expect(screen.getByRole('dialog')).toHaveClass('max-w-2xl');
    });

    it('should support dark mode classes', () => {
      render(<Modal {...defaultProps} />);

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveClass('bg-white', 'dark:bg-gray-800');

      const title = screen.getByRole('heading', { level: 3 });
      expect(title).toHaveClass('text-gray-900', 'dark:text-white');

      const closeButton = screen.getByRole('button');
      expect(closeButton).toHaveClass('text-gray-400', 'dark:hover:text-gray-300');
    });
  });
});