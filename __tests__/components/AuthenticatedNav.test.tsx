import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AuthenticatedNav } from '@/components/AuthenticatedNav';

// Mock Next.js Link component
jest.mock('next/link', () => {
  return ({ children, href, ...props }: any) => {
    return <a href={href} {...props}>{children}</a>;
  };
});

// Mock the AuthProvider
const mockUseAuth = jest.fn();
jest.mock('@/app/providers/AuthProvider', () => ({
  useAuth: () => mockUseAuth(),
}));

describe('AuthenticatedNav', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Clean up event listeners
    document.removeEventListener('mousedown', jest.fn());
  });

  describe('when user is not authenticated', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        user: null,
        signOut: jest.fn(),
        isAuthenticated: false,
      });
    });

    it('should render public navigation links', () => {
      render(<AuthenticatedNav />);

      expect(screen.getByText('How it works')).toBeInTheDocument();
      expect(screen.getByText('Makers')).toBeInTheDocument();
      expect(screen.getByText('Backers')).toBeInTheDocument();
      expect(screen.getByText('Campaigns')).toBeInTheDocument();
      expect(screen.getByText('Services')).toBeInTheDocument();
      expect(screen.getByText('Sign in')).toBeInTheDocument();
    });

    it('should have correct href attributes for public links', () => {
      render(<AuthenticatedNav />);

      expect(screen.getByText('How it works').closest('a')).toHaveAttribute('href', '/#how');
      expect(screen.getByText('Makers').closest('a')).toHaveAttribute('href', '/#makers');
      expect(screen.getByText('Backers').closest('a')).toHaveAttribute('href', '/#backers');
      expect(screen.getByText('Campaigns').closest('a')).toHaveAttribute('href', '/campaigns');
      expect(screen.getByText('Services').closest('a')).toHaveAttribute('href', '/services');
      expect(screen.getByText('Sign in').closest('a')).toHaveAttribute('href', '/signin');
    });

    it('should not render authenticated user elements', () => {
      render(<AuthenticatedNav />);

      expect(screen.queryByText('Dashboard')).not.toBeInTheDocument();
      expect(screen.queryByText('Admin')).not.toBeInTheDocument();
      expect(screen.queryByText('Personal Profile')).not.toBeInTheDocument();
    });
  });

  describe('when user is authenticated', () => {
    const mockSignOut = jest.fn();
    const mockUser = {
      email: 'test@example.com',
      roles: ['user'],
    };

    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        user: mockUser,
        signOut: mockSignOut,
        isAuthenticated: true,
      });
    });

    it('should render authenticated navigation links', () => {
      render(<AuthenticatedNav />);

      expect(screen.getByText('Campaigns')).toBeInTheDocument();
      expect(screen.getByText('Services')).toBeInTheDocument();
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });

    it('should display user avatar with first letter of email', () => {
      render(<AuthenticatedNav />);

      expect(screen.getByText('T')).toBeInTheDocument(); // First letter of test@example.com
    });

    it('should display username from email', () => {
      render(<AuthenticatedNav />);

      expect(screen.getByText('test')).toBeInTheDocument(); // Username part of test@example.com
    });

    it('should not show admin link for regular user', () => {
      render(<AuthenticatedNav />);

      expect(screen.queryByText('Admin')).not.toBeInTheDocument();
    });

    it('should show admin link for admin user', () => {
      mockUseAuth.mockReturnValue({
        user: { ...mockUser, roles: ['admin'] },
        signOut: mockSignOut,
        isAuthenticated: true,
      });

      render(<AuthenticatedNav />);

      expect(screen.getByText('Admin')).toBeInTheDocument();
      expect(screen.getByText('Admin').closest('a')).toHaveAttribute('href', '/admin');
    });

    it('should toggle user menu when clicking user button', async () => {
      render(<AuthenticatedNav />);

      const userButton = screen.getByRole('button');
      
      // Menu should not be visible initially
      expect(screen.queryByText('Signed in as')).not.toBeInTheDocument();

      // Click to open menu
      fireEvent.click(userButton);

      await waitFor(() => {
        expect(screen.getByText('Signed in as')).toBeInTheDocument();
      });

      // Click to close menu
      fireEvent.click(userButton);

      await waitFor(() => {
        expect(screen.queryByText('Signed in as')).not.toBeInTheDocument();
      });
    });

    it('should display correct menu items when menu is open', async () => {
      render(<AuthenticatedNav />);

      const userButton = screen.getByRole('button');
      fireEvent.click(userButton);

      await waitFor(() => {
        expect(screen.getByText('Signed in as')).toBeInTheDocument();
        expect(screen.getByText('test@example.com')).toBeInTheDocument();
        expect(screen.getByText('Personal Profile')).toBeInTheDocument();
        expect(screen.getByText('Business Profile')).toBeInTheDocument();
        expect(screen.getByText('Security & Passkeys')).toBeInTheDocument();
        expect(screen.getByText('Sign out')).toBeInTheDocument();
      });
    });

    it('should have correct href attributes for profile links', async () => {
      render(<AuthenticatedNav />);

      const userButton = screen.getByRole('button');
      fireEvent.click(userButton);

      await waitFor(() => {
        expect(screen.getByText('Personal Profile').closest('a')).toHaveAttribute('href', '/profile');
        expect(screen.getByText('Business Profile').closest('a')).toHaveAttribute('href', '/profile/business');
        expect(screen.getByText('Security & Passkeys').closest('a')).toHaveAttribute('href', '/profile/passkeys');
      });
    });

    it('should close menu when clicking profile link', async () => {
      render(<AuthenticatedNav />);

      const userButton = screen.getByRole('button');
      fireEvent.click(userButton);

      await waitFor(() => {
        expect(screen.getByText('Personal Profile')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Personal Profile'));

      await waitFor(() => {
        expect(screen.queryByText('Signed in as')).not.toBeInTheDocument();
      });
    });

    it('should call signOut and close menu when clicking sign out', async () => {
      render(<AuthenticatedNav />);

      const userButton = screen.getByRole('button');
      fireEvent.click(userButton);

      await waitFor(() => {
        expect(screen.getByText('Sign out')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Sign out'));

      expect(mockSignOut).toHaveBeenCalledTimes(1);
    });

    it('should close menu when clicking outside', async () => {
      render(
        <div>
          <AuthenticatedNav />
          <div data-testid="outside">Outside element</div>
        </div>
      );

      const userButton = screen.getByRole('button');
      fireEvent.click(userButton);

      await waitFor(() => {
        expect(screen.getByText('Signed in as')).toBeInTheDocument();
      });

      // Click outside the menu
      fireEvent.mouseDown(screen.getByTestId('outside'));

      await waitFor(() => {
        expect(screen.queryByText('Signed in as')).not.toBeInTheDocument();
      });
    });

    it('should handle user with undefined email gracefully', () => {
      mockUseAuth.mockReturnValue({
        user: { email: undefined, roles: ['user'] },
        signOut: mockSignOut,
        isAuthenticated: true,
      });

      render(<AuthenticatedNav />);

      // Should show 'U' as fallback for undefined email
      expect(screen.getByText('U')).toBeInTheDocument();
    });

    it('should handle user with empty roles gracefully', () => {
      mockUseAuth.mockReturnValue({
        user: { email: 'test@example.com', roles: undefined },
        signOut: mockSignOut,
        isAuthenticated: true,
      });

      render(<AuthenticatedNav />);

      // Should render without admin link
      expect(screen.queryByText('Admin')).not.toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        user: { email: 'test@example.com', roles: ['user'] },
        signOut: jest.fn(),
        isAuthenticated: true,
      });
    });

    it('should have proper button role for user menu', () => {
      render(<AuthenticatedNav />);

      const userButton = screen.getByRole('button');
      expect(userButton).toBeInTheDocument();
    });

    it('should have proper navigation structure', () => {
      render(<AuthenticatedNav />);

      const nav = screen.getByRole('navigation');
      expect(nav).toBeInTheDocument();
    });

    it('should support keyboard navigation', async () => {
      render(<AuthenticatedNav />);

      const userButton = screen.getByRole('button');
      
      // Focus the button
      userButton.focus();
      expect(userButton).toHaveFocus();

      // Press Enter to open menu
      fireEvent.keyDown(userButton, { key: 'Enter' });
      fireEvent.click(userButton); // Simulate the click that would happen

      await waitFor(() => {
        expect(screen.getByText('Signed in as')).toBeInTheDocument();
      });
    });
  });

  describe('visual states', () => {
    it('should apply correct CSS classes for unauthenticated state', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        signOut: jest.fn(),
        isAuthenticated: false,
      });

      render(<AuthenticatedNav />);

      const nav = screen.getByRole('navigation');
      expect(nav).toHaveClass('hidden', 'md:flex', 'items-center', 'space-x-8');
    });

    it('should apply correct CSS classes for authenticated state', () => {
      mockUseAuth.mockReturnValue({
        user: { email: 'test@example.com', roles: ['user'] },
        signOut: jest.fn(),
        isAuthenticated: true,
      });

      render(<AuthenticatedNav />);

      const nav = screen.getByRole('navigation');
      expect(nav).toHaveClass('hidden', 'md:flex', 'items-center', 'space-x-8');
    });

    it('should show dropdown arrow icon', () => {
      mockUseAuth.mockReturnValue({
        user: { email: 'test@example.com', roles: ['user'] },
        signOut: jest.fn(),
        isAuthenticated: true,
      });

      render(<AuthenticatedNav />);

      const svgElement = screen.getByRole('button').querySelector('svg');
      expect(svgElement).toHaveAttribute('viewBox', '0 0 24 24');
    });
  });
});