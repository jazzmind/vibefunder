import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import SignIn from '@/app/signin/page';

// Mock SimpleWebAuthn browser functions
jest.mock('@simplewebauthn/browser', () => ({
  startAuthentication: jest.fn(),
  startRegistration: jest.fn(),
  browserSupportsWebAuthn: jest.fn().mockReturnValue(true),
}));

// Mock Next.js Link component
jest.mock('next/link', () => {
  return ({ children, href, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  );
});

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock window.location
const mockLocation = {
  href: '',
  search: '',
};
Object.defineProperty(window, 'location', {
  value: mockLocation,
  writable: true,
});

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

describe('SignIn Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(null);
    mockLocation.href = '';
    mockLocation.search = '';
  });

  describe('Initial render and setup', () => {
    it('should render sign in form initially', () => {
      render(<SignIn />);

      expect(screen.getByRole('heading', { name: /sign in to your account/i })).toBeInTheDocument();
      expect(screen.getByText('Enter your email to get started')).toBeInTheDocument();
      expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /send code/i })).toBeInTheDocument();
    });

    it('should show passkey option in email step', () => {
      render(<SignIn />);

      expect(screen.getByRole('button', { name: /🔐 sign in with passkey/i })).toBeInTheDocument();
      expect(screen.getByText('or')).toBeInTheDocument();
    });

    it('should render branding correctly', () => {
      render(<SignIn />);

      expect(screen.getByRole('link', { name: /vibefunder\.ai/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /vibefunder\.ai/i })).toHaveAttribute('href', '/');
    });

    it('should check for existing session on mount', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ user: null }),
      } as any);

      render(<SignIn />);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/auth/session');
      });
    });

    it('should redirect if already authenticated', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ user: { id: 'user-1' } }),
      } as any);

      render(<SignIn />);

      await waitFor(() => {
        expect(mockLocation.href).toBe('/dashboard');
      });
    });

    it('should check signup status on mount', async () => {
      mockFetch
        .mockResolvedValueOnce({
          json: () => Promise.resolve({ user: null }),
        } as any)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ signupsEnabled: true }),
        } as any);

      render(<SignIn />);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/auth/check-signup-status');
      });
    });
  });

  describe('Email submission flow', () => {
    it('should handle email input changes', () => {
      render(<SignIn />);

      const emailInput = screen.getByLabelText(/email address/i) as HTMLInputElement;
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });

      expect(emailInput.value).toBe('test@example.com');
    });

    it('should submit email and move to OTP step', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ message: 'Code sent successfully' }),
      } as any);

      render(<SignIn />);

      const emailInput = screen.getByLabelText(/email address/i);
      const submitButton = screen.getByRole('button', { name: /send code/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/auth/send-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'test@example.com' }),
        });
      });

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /enter your code/i })).toBeInTheDocument();
        expect(screen.getByText('We sent a 6-digit code to test@example.com')).toBeInTheDocument();
        expect(screen.getByText('Code sent successfully')).toBeInTheDocument();
      });
    });

    it('should handle email submission errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Invalid email address' }),
      } as any);

      render(<SignIn />);

      const emailInput = screen.getByLabelText(/email address/i);
      const submitButton = screen.getByRole('button', { name: /send code/i });

      fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Invalid email address')).toBeInTheDocument();
      });
    });

    it('should handle waitlist flow when signups disabled', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ needsWaitlist: true }),
      } as any);

      render(<SignIn />);

      const emailInput = screen.getByLabelText(/email address/i);
      const submitButton = screen.getByRole('button', { name: /send code/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /join our waitlist/i })).toBeInTheDocument();
      });
    });

    it('should show loading state during email submission', async () => {
      const mockPromise = new Promise(resolve => setTimeout(resolve, 100));
      mockFetch.mockReturnValueOnce(mockPromise as any);

      render(<SignIn />);

      const emailInput = screen.getByLabelText(/email address/i);
      const submitButton = screen.getByRole('button', { name: /send code/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.click(submitButton);

      expect(screen.getByRole('button', { name: /sending.../i })).toBeInTheDocument();
    });
  });

  describe('OTP verification flow', () => {
    beforeEach(async () => {
      // Set up to be in OTP step
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ message: 'Code sent' }),
      } as any);

      render(<SignIn />);

      const emailInput = screen.getByLabelText(/email address/i);
      const submitButton = screen.getByRole('button', { name: /send code/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /enter your code/i })).toBeInTheDocument();
      });

      jest.clearAllMocks();
    });

    it('should handle OTP input changes', () => {
      const otpInput = screen.getByLabelText(/6-digit code/i) as HTMLInputElement;

      fireEvent.change(otpInput, { target: { value: '123456' } });

      expect(otpInput.value).toBe('123456');
    });

    it('should limit OTP input to 6 digits', () => {
      const otpInput = screen.getByLabelText(/6-digit code/i) as HTMLInputElement;

      fireEvent.change(otpInput, { target: { value: '1234567890' } });

      expect(otpInput.value).toBe('123456');
    });

    it('should only allow numeric input for OTP', () => {
      const otpInput = screen.getByLabelText(/6-digit code/i) as HTMLInputElement;

      fireEvent.change(otpInput, { target: { value: 'abc123def' } });

      expect(otpInput.value).toBe('123');
    });

    it('should verify OTP and redirect to dashboard', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ user: { id: 'user-1' } }),
        } as any)
        .mockResolvedValueOnce({
          json: () => Promise.resolve({ hasPasskeys: true }),
        } as any);

      const otpInput = screen.getByLabelText(/6-digit code/i);
      const verifyButton = screen.getByRole('button', { name: /verify code/i });

      fireEvent.change(otpInput, { target: { value: '123456' } });
      fireEvent.click(verifyButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/auth/verify-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'test@example.com', code: '123456' }),
        });
      });

      await waitFor(() => {
        expect(mockLocation.href).toBe('/dashboard');
      });
    });

    it('should move to passkey setup when user has no passkeys', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ user: { id: 'user-1' } }),
        } as any)
        .mockResolvedValueOnce({
          json: () => Promise.resolve({ hasPasskeys: false }),
        } as any);

      const otpInput = screen.getByLabelText(/6-digit code/i);
      const verifyButton = screen.getByRole('button', { name: /verify code/i });

      fireEvent.change(otpInput, { target: { value: '123456' } });
      fireEvent.click(verifyButton);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /set up secure sign-in/i })).toBeInTheDocument();
      });
    });

    it('should handle OTP verification errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Invalid code' }),
      } as any);

      const otpInput = screen.getByLabelText(/6-digit code/i);
      const verifyButton = screen.getByRole('button', { name: /verify code/i });

      fireEvent.change(otpInput, { target: { value: '123456' } });
      fireEvent.click(verifyButton);

      await waitFor(() => {
        expect(screen.getByText('Invalid code')).toBeInTheDocument();
      });
    });

    it('should disable verify button until 6 digits entered', () => {
      const otpInput = screen.getByLabelText(/6-digit code/i);
      const verifyButton = screen.getByRole('button', { name: /verify code/i });

      expect(verifyButton).toBeDisabled();

      fireEvent.change(otpInput, { target: { value: '12345' } });
      expect(verifyButton).toBeDisabled();

      fireEvent.change(otpInput, { target: { value: '123456' } });
      expect(verifyButton).not.toBeDisabled();
    });

    it('should allow navigation back to email step', () => {
      const backButton = screen.getByRole('button', { name: /back/i });

      fireEvent.click(backButton);

      expect(screen.getByRole('heading', { name: /sign in to your account/i })).toBeInTheDocument();
    });
  });

  describe('Passkey authentication', () => {
    it('should handle passkey authentication from email step', async () => {
      const { startAuthentication } = require('@simplewebauthn/browser');
      
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ challenge: 'mock-challenge' }),
        } as any)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true }),
        } as any);

      startAuthentication.mockResolvedValue({ id: 'mock-credential' });

      render(<SignIn />);

      const passkeyButton = screen.getByRole('button', { name: /🔐 sign in with passkey/i });
      fireEvent.click(passkeyButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/auth/passkey/auth-options', {
          method: 'POST',
        });
      });

      await waitFor(() => {
        expect(startAuthentication).toHaveBeenCalledWith({ challenge: 'mock-challenge' });
      });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/auth/passkey/authenticate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ credential: { id: 'mock-credential' } }),
        });
      });

      await waitFor(() => {
        expect(mockLocalStorage.setItem).toHaveBeenCalledWith('vibefunder_has_passkeys', 'true');
        expect(mockLocation.href).toBe('/dashboard');
      });
    });

    it('should handle passkey authentication errors', async () => {
      const { startAuthentication } = require('@simplewebauthn/browser');
      
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'No passkeys found' }),
      } as any);

      render(<SignIn />);

      const passkeyButton = screen.getByRole('button', { name: /🔐 sign in with passkey/i });
      fireEvent.click(passkeyButton);

      await waitFor(() => {
        expect(screen.getByText('No passkeys found')).toBeInTheDocument();
      });
    });

    it('should show auto passkey step when localStorage indicates passkeys exist', () => {
      mockLocalStorage.getItem.mockReturnValue('true');

      render(<SignIn />);

      expect(screen.getByRole('heading', { name: /sign in with your passkey/i })).toBeInTheDocument();
      expect(screen.getByText('We detected a passkey on this device.')).toBeInTheDocument();
    });
  });

  describe('Passkey setup', () => {
    beforeEach(async () => {
      // Mock the flow to reach passkey setup
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ message: 'Code sent' }),
        } as any)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ user: { id: 'user-1' } }),
        } as any)
        .mockResolvedValueOnce({
          json: () => Promise.resolve({ hasPasskeys: false }),
        } as any);

      render(<SignIn />);

      // Go through email step
      const emailInput = screen.getByLabelText(/email address/i);
      const submitButton = screen.getByRole('button', { name: /send code/i });
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /enter your code/i })).toBeInTheDocument();
      });

      // Go through OTP step
      const otpInput = screen.getByLabelText(/6-digit code/i);
      const verifyButton = screen.getByRole('button', { name: /verify code/i });
      fireEvent.change(otpInput, { target: { value: '123456' } });
      fireEvent.click(verifyButton);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /set up secure sign-in/i })).toBeInTheDocument();
      });

      jest.clearAllMocks();
    });

    it('should handle passkey setup successfully', async () => {
      const { startRegistration } = require('@simplewebauthn/browser');
      
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ challenge: 'setup-challenge' }),
        } as any)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true }),
        } as any);

      startRegistration.mockResolvedValue({ id: 'new-credential' });

      const setupButton = screen.getByRole('button', { name: /set up passkey/i });
      fireEvent.click(setupButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/auth/passkey/register-options');
      });

      await waitFor(() => {
        expect(startRegistration).toHaveBeenCalledWith({ challenge: 'setup-challenge' });
      });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/auth/passkey/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ credential: { id: 'new-credential' } }),
        });
      });

      await waitFor(() => {
        expect(mockLocalStorage.setItem).toHaveBeenCalledWith('vibefunder_has_passkeys', 'true');
        expect(mockLocation.href).toBe('/dashboard');
      });
    });

    it('should allow skipping passkey setup', () => {
      const skipButton = screen.getByRole('button', { name: /skip for now/i });
      fireEvent.click(skipButton);

      expect(mockLocation.href).toBe('/dashboard');
    });

    it('should handle passkey setup errors', async () => {
      const { startRegistration } = require('@simplewebauthn/browser');
      
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Setup failed' }),
      } as any);

      const setupButton = screen.getByRole('button', { name: /set up passkey/i });
      fireEvent.click(setupButton);

      await waitFor(() => {
        expect(screen.getByText('Setup failed')).toBeInTheDocument();
      });
    });
  });

  describe('Waitlist flow', () => {
    beforeEach(async () => {
      // Mock the flow to reach waitlist
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ needsWaitlist: true }),
      } as any);

      render(<SignIn />);

      const emailInput = screen.getByLabelText(/email address/i);
      const submitButton = screen.getByRole('button', { name: /send code/i });
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /join our waitlist/i })).toBeInTheDocument();
      });

      jest.clearAllMocks();
    });

    it('should render waitlist form correctly', () => {
      expect(screen.getByText('What do you want to do on VibeFunder?')).toBeInTheDocument();
      expect(screen.getByLabelText(/i want to back campaigns/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/i want to create campaigns/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/i want to provide services/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /join waitlist/i })).toBeInTheDocument();
    });

    it('should handle waitlist reason selection', () => {
      const createCampaignOption = screen.getByLabelText(/i want to create campaigns/i) as HTMLInputElement;
      fireEvent.click(createCampaignOption);

      expect(createCampaignOption.checked).toBe(true);
    });

    it('should submit waitlist form successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      } as any);

      const servicesOption = screen.getByLabelText(/i want to provide services/i);
      const submitButton = screen.getByRole('button', { name: /join waitlist/i });

      fireEvent.click(servicesOption);
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/waitlist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'test@example.com', reason: 'provide_services' }),
        });
      });

      await waitFor(() => {
        expect(screen.getByText('Successfully added to waitlist! Check your email for confirmation.')).toBeInTheDocument();
      });
    });

    it('should handle waitlist submission errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Email already on waitlist' }),
      } as any);

      const submitButton = screen.getByRole('button', { name: /join waitlist/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Email already on waitlist')).toBeInTheDocument();
      });
    });

    it('should allow navigation back to email step from waitlist', () => {
      const backButton = screen.getByRole('button', { name: /back/i });
      fireEvent.click(backButton);

      expect(screen.getByRole('heading', { name: /sign in to your account/i })).toBeInTheDocument();
    });
  });

  describe('Navigation and URL handling', () => {
    it('should handle redirect_to parameter', async () => {
      mockLocation.search = '?redirect_to=/campaigns/create';
      
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ message: 'Code sent' }),
        } as any)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ user: { id: 'user-1' } }),
        } as any)
        .mockResolvedValueOnce({
          json: () => Promise.resolve({ hasPasskeys: true }),
        } as any);

      render(<SignIn />);

      // Go through the flow
      const emailInput = screen.getByLabelText(/email address/i);
      const submitButton = screen.getByRole('button', { name: /send code/i });
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /enter your code/i })).toBeInTheDocument();
      });

      const otpInput = screen.getByLabelText(/6-digit code/i);
      const verifyButton = screen.getByRole('button', { name: /verify code/i });
      fireEvent.change(otpInput, { target: { value: '123456' } });
      fireEvent.click(verifyButton);

      await waitFor(() => {
        expect(mockLocation.href).toBe('/campaigns/create');
      });
    });

    it('should render footer links correctly', () => {
      render(<SignIn />);

      expect(screen.getByText('Don\'t have an account? You\'ll create one automatically when you sign in.')).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /join the waitlist/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /join the waitlist/i })).toHaveAttribute('href', '/waitlist');
    });
  });

  describe('Accessibility and UX', () => {
    it('should have proper form labels and accessibility attributes', () => {
      render(<SignIn />);

      const emailInput = screen.getByLabelText(/email address/i);
      expect(emailInput).toHaveAttribute('type', 'email');
      expect(emailInput).toHaveAttribute('required');
      expect(emailInput).toHaveAttribute('placeholder', 'Enter your email');
    });

    it('should handle network errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      render(<SignIn />);

      const emailInput = screen.getByLabelText(/email address/i);
      const submitButton = screen.getByRole('button', { name: /send code/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument();
      });
    });

    it('should clear error messages when switching steps', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Some error' }),
      } as any);

      render(<SignIn />);

      const emailInput = screen.getByLabelText(/email address/i);
      const submitButton = screen.getByRole('button', { name: /send code/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Some error')).toBeInTheDocument();
      });

      // Click passkey button to switch context
      const passkeyButton = screen.getByRole('button', { name: /🔐 sign in with passkey/i });
      fireEvent.click(passkeyButton);

      // Error should be cleared when starting passkey flow
      expect(screen.queryByText('Some error')).not.toBeInTheDocument();
    });
  });
});