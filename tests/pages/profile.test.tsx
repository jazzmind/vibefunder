import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { redirect } from 'next/navigation';
import PersonalProfile from '@/app/profile/page';
import { verifySession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { cookies } from 'next/headers';

// Mock dependencies
jest.mock('next/navigation', () => ({
  redirect: jest.fn(),
}));

jest.mock('@/lib/auth', () => ({
  verifySession: jest.fn(),
}));

jest.mock('@/lib/db', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

jest.mock('next/headers', () => ({
  cookies: jest.fn(),
}));

// Mock Next.js Link component
jest.mock('next/link', () => {
  return ({ children, href, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  );
});

const mockVerifySession = verifySession as jest.MockedFunction<typeof verifySession>;
const mockPrismaUserFindUnique = prisma.user.findUnique as jest.MockedFunction<typeof prisma.user.findUnique>;
const mockPrismaUserUpdate = prisma.user.update as jest.MockedFunction<typeof prisma.user.update>;
const mockCookies = cookies as jest.MockedFunction<typeof cookies>;
const mockRedirect = redirect as jest.MockedFunction<typeof redirect>;

describe('Personal Profile Page', () => {
  const mockCookieStore = {
    get: jest.fn(),
  };

  const mockUser = {
    id: 'user-1',
    email: 'user@example.com',
    name: 'Test User',
    org: null,
    roles: ['user'],
    createdAt: new Date('2024-01-01'),
    pledges: [
      {
        id: 'pledge-1',
        amountDollars: 250,
        status: 'authorized',
        createdAt: new Date('2024-02-01'),
        campaign: {
          id: 'campaign-1',
          title: 'Amazing AI Tool',
          status: 'live',
          fundingGoalDollars: 100000,
          raisedDollars: 45000,
        },
      },
      {
        id: 'pledge-2',
        amountDollars: 100,
        status: 'captured',
        createdAt: new Date('2024-01-15'),
        campaign: {
          id: 'campaign-2',
          title: 'Productivity App',
          status: 'completed',
          fundingGoalDollars: 50000,
          raisedDollars: 75000,
        },
      },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockCookies.mockResolvedValue(mockCookieStore as any);
    mockCookieStore.get.mockReturnValue({ value: 'session-token' });
  });

  describe('Authentication and access control', () => {
    it('should redirect to signin when no session token', async () => {
      mockCookieStore.get.mockReturnValue(undefined);
      mockVerifySession.mockResolvedValue(null);

      await PersonalProfile();

      expect(mockRedirect).toHaveBeenCalledWith('/signin');
    });

    it('should redirect to signin when session is invalid', async () => {
      mockVerifySession.mockResolvedValue(null);

      await PersonalProfile();

      expect(mockRedirect).toHaveBeenCalledWith('/signin');
    });

    it('should redirect to signin when user not found', async () => {
      mockVerifySession.mockResolvedValue({ userId: 'user-1' });
      mockPrismaUserFindUnique.mockResolvedValue(null);

      await PersonalProfile();

      expect(mockRedirect).toHaveBeenCalledWith('/signin');
    });
  });

  describe('Profile rendering for authenticated users', () => {
    beforeEach(() => {
      mockVerifySession.mockResolvedValue({ userId: 'user-1' });
      mockPrismaUserFindUnique.mockResolvedValue(mockUser);
    });

    it('should render profile page for authenticated user', async () => {
      const component = await PersonalProfile();
      render(component);

      expect(screen.getByRole('heading', { name: /personal profile/i })).toBeInTheDocument();
      expect(screen.getByText('Manage your personal information and account settings')).toBeInTheDocument();
    });

    it('should display user information correctly', async () => {
      const component = await PersonalProfile();
      render(component);

      // Check avatar with user initial
      expect(screen.getByText('T')).toBeInTheDocument(); // First letter of "Test User"
      
      // Check user name and email
      expect(screen.getByText('Test User')).toBeInTheDocument();
      expect(screen.getByText('user@example.com')).toBeInTheDocument();
      
      // Check roles
      expect(screen.getByText('user')).toBeInTheDocument();
      
      // Check member since date
      expect(screen.getByText('Member since 1/1/2024')).toBeInTheDocument();
    });

    it('should display email as display name when name is not set', async () => {
      const userWithoutName = { ...mockUser, name: null };
      mockPrismaUserFindUnique.mockResolvedValue(userWithoutName);

      const component = await PersonalProfile();
      render(component);

      expect(screen.getByText('user')).toBeInTheDocument(); // Email prefix as display name
      expect(screen.getByText('U')).toBeInTheDocument(); // First letter of email
    });

    it('should render profile form with correct default values', async () => {
      const component = await PersonalProfile();
      render(component);

      const emailInput = screen.getByDisplayValue('user@example.com') as HTMLInputElement;
      const nameInput = screen.getByDisplayValue('Test User') as HTMLInputElement;

      expect(emailInput).toBeInTheDocument();
      expect(emailInput).toBeDisabled();
      expect(nameInput).toBeInTheDocument();
      expect(nameInput).not.toBeDisabled();
    });

    it('should show email cannot be changed message', async () => {
      const component = await PersonalProfile();
      render(component);

      expect(screen.getByText('Email cannot be changed')).toBeInTheDocument();
    });
  });

  describe('Pledges management', () => {
    beforeEach(() => {
      mockVerifySession.mockResolvedValue({ userId: 'user-1' });
      mockPrismaUserFindUnique.mockResolvedValue(mockUser);
    });

    it('should render pledges section when user has pledges', async () => {
      const component = await PersonalProfile();
      render(component);

      expect(screen.getByText('Your Pledges')).toBeInTheDocument();
      expect(screen.getByText('Amazing AI Tool')).toBeInTheDocument();
      expect(screen.getByText('Productivity App')).toBeInTheDocument();
    });

    it('should display pledge information correctly', async () => {
      const component = await PersonalProfile();
      render(component);

      // Check first pledge
      expect(screen.getByText('Amazing AI Tool')).toBeInTheDocument();
      expect(screen.getByText('$250')).toBeInTheDocument();
      expect(screen.getByText('Pending')).toBeInTheDocument(); // authorized status
      expect(screen.getByText('Campaign: live')).toBeInTheDocument();

      // Check second pledge
      expect(screen.getByText('Productivity App')).toBeInTheDocument();
      expect(screen.getByText('$100')).toBeInTheDocument();
      expect(screen.getByText('Funded')).toBeInTheDocument(); // captured status
      expect(screen.getByText('Campaign: completed')).toBeInTheDocument();
    });

    it('should show pledge progress bars', async () => {
      const component = await PersonalProfile();
      render(component);

      // Check progress percentages
      expect(screen.getByText('45% funded')).toBeInTheDocument(); // Amazing AI Tool: 45000/100000
      expect(screen.getByText('150% funded')).toBeInTheDocument(); // Productivity App: 75000/50000
    });

    it('should display total pledged amount', async () => {
      const component = await PersonalProfile();
      render(component);

      expect(screen.getByText('Total Pledged')).toBeInTheDocument();
      expect(screen.getByText('$350')).toBeInTheDocument(); // $250 + $100
      expect(screen.getByText('2 campaigns')).toBeInTheDocument();
    });

    it('should render campaign links correctly', async () => {
      const component = await PersonalProfile();
      render(component);

      const viewCampaignLinks = screen.getAllByRole('link', { name: /view campaign/i });
      const updatesLinks = screen.getAllByRole('link', { name: /updates/i });

      expect(viewCampaignLinks).toHaveLength(2);
      expect(updatesLinks).toHaveLength(2);

      expect(viewCampaignLinks[0]).toHaveAttribute('href', '/campaigns/campaign-1');
      expect(updatesLinks[0]).toHaveAttribute('href', '/campaigns/campaign-1/updates');
    });

    it('should not render pledges section when user has no pledges', async () => {
      const userWithoutPledges = { ...mockUser, pledges: [] };
      mockPrismaUserFindUnique.mockResolvedValue(userWithoutPledges);

      const component = await PersonalProfile();
      render(component);

      expect(screen.queryByText('Your Pledges')).not.toBeInTheDocument();
    });

    it('should handle singular campaign text correctly', async () => {
      const userWithOnePledge = {
        ...mockUser,
        pledges: [mockUser.pledges[0]], // Only one pledge
      };
      mockPrismaUserFindUnique.mockResolvedValue(userWithOnePledge);

      const component = await PersonalProfile();
      render(component);

      expect(screen.getByText('1 campaign')).toBeInTheDocument(); // Singular form
    });
  });

  describe('Profile form interactions', () => {
    beforeEach(() => {
      mockVerifySession.mockResolvedValue({ userId: 'user-1' });
      mockPrismaUserFindUnique.mockResolvedValue(mockUser);
    });

    it('should handle name input changes', async () => {
      const component = await PersonalProfile();
      render(component);

      const nameInput = screen.getByDisplayValue('Test User') as HTMLInputElement;
      
      fireEvent.change(nameInput, { target: { value: 'Updated Name' } });
      
      expect(nameInput.value).toBe('Updated Name');
    });

    it('should render save changes button', async () => {
      const component = await PersonalProfile();
      render(component);

      expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument();
    });

    // Note: Testing actual form submission is complex with server actions
    // and would require more extensive mocking of Next.js internals
  });

  describe('Account actions section', () => {
    beforeEach(() => {
      mockVerifySession.mockResolvedValue({ userId: 'user-1' });
      mockPrismaUserFindUnique.mockResolvedValue(mockUser);
    });

    it('should render account actions section', async () => {
      const component = await PersonalProfile();
      render(component);

      expect(screen.getByText('Account Actions')).toBeInTheDocument();
      expect(screen.getByText('Security Settings')).toBeInTheDocument();
      expect(screen.getByText('Manage your passkeys and authentication methods for secure sign-in.')).toBeInTheDocument();
    });

    it('should render manage security link', async () => {
      const component = await PersonalProfile();
      render(component);

      const securityLink = screen.getByRole('link', { name: /manage security/i });
      expect(securityLink).toBeInTheDocument();
      expect(securityLink).toHaveAttribute('href', '/profile/passkeys');
    });
  });

  describe('User roles display', () => {
    it('should display multiple roles correctly', async () => {
      const userWithMultipleRoles = {
        ...mockUser,
        roles: ['user', 'admin', 'maker'],
      };
      
      mockVerifySession.mockResolvedValue({ userId: 'user-1' });
      mockPrismaUserFindUnique.mockResolvedValue(userWithMultipleRoles);

      const component = await PersonalProfile();
      render(component);

      expect(screen.getByText('user')).toBeInTheDocument();
      expect(screen.getByText('admin')).toBeInTheDocument();
      expect(screen.getByText('maker')).toBeInTheDocument();
    });

    it('should display no roles when roles array is empty', async () => {
      const userWithNoRoles = {
        ...mockUser,
        roles: [],
      };
      
      mockVerifySession.mockResolvedValue({ userId: 'user-1' });
      mockPrismaUserFindUnique.mockResolvedValue(userWithNoRoles);

      const component = await PersonalProfile();
      render(component);

      // Should not crash and should render other user info
      expect(screen.getByText('Test User')).toBeInTheDocument();
    });
  });

  describe('Edge cases and error handling', () => {
    it('should handle user with organization', async () => {
      const userWithOrg = {
        ...mockUser,
        org: 'Acme Corp',
      };
      
      mockVerifySession.mockResolvedValue({ userId: 'user-1' });
      mockPrismaUserFindUnique.mockResolvedValue(userWithOrg);

      const component = await PersonalProfile();
      render(component);

      expect(screen.getByText('Test User')).toBeInTheDocument();
      // Organization field might be displayed somewhere in the profile
    });

    it('should handle pledge with zero goal (edge case)', async () => {
      const userWithZeroGoalPledge = {
        ...mockUser,
        pledges: [{
          ...mockUser.pledges[0],
          campaign: {
            ...mockUser.pledges[0].campaign,
            fundingGoalDollars: 0,
          },
        }],
      };
      
      mockVerifySession.mockResolvedValue({ userId: 'user-1' });
      mockPrismaUserFindUnique.mockResolvedValue(userWithZeroGoalPledge);

      const component = await PersonalProfile();
      render(component);

      // Should not crash with division by zero
      expect(screen.getByText('Amazing AI Tool')).toBeInTheDocument();
    });

    it('should handle very old member dates', async () => {
      const oldUser = {
        ...mockUser,
        createdAt: new Date('2020-01-01'),
      };
      
      mockVerifySession.mockResolvedValue({ userId: 'user-1' });
      mockPrismaUserFindUnique.mockResolvedValue(oldUser);

      const component = await PersonalProfile();
      render(component);

      expect(screen.getByText('Member since 1/1/2020')).toBeInTheDocument();
    });

    it('should handle different pledge status values', async () => {
      const userWithVariousStatuses = {
        ...mockUser,
        pledges: [
          {
            ...mockUser.pledges[0],
            status: 'failed',
          },
          {
            ...mockUser.pledges[1],
            status: 'refunded',
          },
        ],
      };
      
      mockVerifySession.mockResolvedValue({ userId: 'user-1' });
      mockPrismaUserFindUnique.mockResolvedValue(userWithVariousStatuses);

      const component = await PersonalProfile();
      render(component);

      expect(screen.getByText('Failed')).toBeInTheDocument();
      expect(screen.getByText('Refunded')).toBeInTheDocument();
    });
  });

  describe('Responsive design and accessibility', () => {
    beforeEach(() => {
      mockVerifySession.mockResolvedValue({ userId: 'user-1' });
      mockPrismaUserFindUnique.mockResolvedValue(mockUser);
    });

    it('should have proper heading structure', async () => {
      const component = await PersonalProfile();
      render(component);

      const mainHeading = screen.getByRole('heading', { level: 1 });
      const subHeadings = screen.getAllByRole('heading', { level: 3 });

      expect(mainHeading).toBeInTheDocument();
      expect(subHeadings.length).toBeGreaterThan(0);
    });

    it('should have proper form labels', async () => {
      const component = await PersonalProfile();
      render(component);

      expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/display name/i)).toBeInTheDocument();
    });

    it('should render responsive grid classes', async () => {
      const component = await PersonalProfile();
      render(component);

      // Check that the main container has responsive classes
      const mainContainer = screen.getByText('Personal Profile').closest('.max-w-4xl');
      expect(mainContainer).toHaveClass('px-4', 'sm:px-6', 'lg:px-8');
    });
  });

  describe('Data fetching and queries', () => {
    it('should fetch user with correct include options', async () => {
      mockVerifySession.mockResolvedValue({ userId: 'user-1' });
      mockPrismaUserFindUnique.mockResolvedValue(mockUser);

      await PersonalProfile();

      expect(mockPrismaUserFindUnique).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        select: {
          id: true,
          email: true,
          name: true,
          org: true,
          roles: true,
          createdAt: true,
          pledges: {
            include: {
              campaign: {
                select: {
                  id: true,
                  title: true,
                  status: true,
                  fundingGoalDollars: true,
                  raisedDollars: true,
                },
              },
            },
            orderBy: { createdAt: 'desc' },
          },
        },
      });
    });

    it('should handle database connection errors', async () => {
      mockVerifySession.mockResolvedValue({ userId: 'user-1' });
      mockPrismaUserFindUnique.mockRejectedValue(new Error('Database connection failed'));

      await expect(PersonalProfile()).rejects.toThrow('Database connection failed');
    });
  });
});