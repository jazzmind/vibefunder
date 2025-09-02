import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { redirect } from 'next/navigation';
import Dashboard from '@/app/dashboard/page';
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
    campaign: {
      findMany: jest.fn(),
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
const mockPrismaCampaignFindMany = prisma.campaign.findMany as jest.MockedFunction<typeof prisma.campaign.findMany>;
const mockCookies = cookies as jest.MockedFunction<typeof cookies>;
const mockRedirect = redirect as jest.MockedFunction<typeof redirect>;

describe('Dashboard Page', () => {
  const mockCookieStore = {
    get: jest.fn(),
  };

  const mockCampaigns = [
    {
      id: 'campaign-1',
      title: 'AI Platform',
      summary: 'Revolutionary AI platform for businesses',
      status: 'draft',
      raisedDollars: 0,
      fundingGoalDollars: 100000,
      createdAt: new Date('2024-01-15'),
      _count: { pledges: 0, comments: 0, milestones: 3 },
    },
    {
      id: 'campaign-2',
      title: 'Analytics Tool',
      summary: 'Advanced analytics for enterprises',
      status: 'live',
      raisedDollars: 45000,
      fundingGoalDollars: 150000,
      createdAt: new Date('2024-02-01'),
      _count: { pledges: 25, comments: 8, milestones: 4 },
    },
    {
      id: 'campaign-3',
      title: 'Productivity App',
      summary: 'Boost team productivity',
      status: 'completed',
      raisedDollars: 80000,
      fundingGoalDollars: 75000,
      createdAt: new Date('2024-01-01'),
      _count: { pledges: 40, comments: 15, milestones: 5 },
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockCookies.mockResolvedValue(mockCookieStore as any);
    mockCookieStore.get.mockReturnValue({ value: 'session-token' });
  });

  describe('Authentication', () => {
    it('should redirect to signin when no session token', async () => {
      mockCookieStore.get.mockReturnValue(undefined);
      mockVerifySession.mockResolvedValue(null);

      const searchParams = Promise.resolve({});
      await Dashboard({ searchParams });

      expect(mockRedirect).toHaveBeenCalledWith('/signin');
    });

    it('should redirect to signin when session is invalid', async () => {
      mockVerifySession.mockResolvedValue(null);

      const searchParams = Promise.resolve({});
      await Dashboard({ searchParams });

      expect(mockRedirect).toHaveBeenCalledWith('/signin');
    });
  });

  describe('First-time user experience (no campaigns)', () => {
    beforeEach(() => {
      mockVerifySession.mockResolvedValue({ userId: 'user-1' });
      mockPrismaCampaignFindMany.mockResolvedValue([]);
    });

    it('should render welcome screen for users with no campaigns', async () => {
      const searchParams = Promise.resolve({});
      const component = await Dashboard({ searchParams });
      render(component);

      expect(screen.getByText('Welcome to VibeFunder!')).toBeInTheDocument();
      expect(screen.getByText('Ready to launch your first campaign? Connect with charter customers and validate your ideas.')).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /create your first campaign/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /create your first campaign/i })).toHaveAttribute('href', '/campaigns/create');
    });

    it('should render welcome screen with proper styling and icon', async () => {
      const searchParams = Promise.resolve({});
      const component = await Dashboard({ searchParams });
      render(component);

      // Check for centered layout and icon presence
      const welcomeSection = screen.getByText('Welcome to VibeFunder!').closest('div');
      expect(welcomeSection).toHaveClass('text-center');
      
      // Check for plus icon SVG
      const svg = screen.getByRole('img', { hidden: true });
      expect(svg).toBeInTheDocument();
    });
  });

  describe('Dashboard for users with campaigns', () => {
    beforeEach(() => {
      mockVerifySession.mockResolvedValue({ userId: 'user-1' });
      mockPrismaCampaignFindMany.mockResolvedValue(mockCampaigns);
    });

    it('should render dashboard header and stats', async () => {
      const searchParams = Promise.resolve({});
      const component = await Dashboard({ searchParams });
      render(component);

      expect(screen.getByRole('heading', { name: /campaign dashboard/i })).toBeInTheDocument();
      expect(screen.getByText('Manage your campaigns, track progress, and engage with your community.')).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /create new campaign/i })).toBeInTheDocument();
    });

    it('should display correct statistics', async () => {
      const searchParams = Promise.resolve({});
      const component = await Dashboard({ searchParams });
      render(component);

      expect(screen.getByText('Total Campaigns')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument(); // Total campaigns

      expect(screen.getByText('Total Raised')).toBeInTheDocument();
      expect(screen.getByText('$125,000')).toBeInTheDocument(); // 0 + 45000 + 80000

      expect(screen.getByText('Total Backers')).toBeInTheDocument();
      expect(screen.getByText('65')).toBeInTheDocument(); // 0 + 25 + 40

      expect(screen.getByText('Live Campaigns')).toBeInTheDocument();
      expect(screen.getByText('1')).toBeInTheDocument(); // Only campaign-2 is live
    });

    it('should render stats cards with proper styling', async () => {
      const searchParams = Promise.resolve({});
      const component = await Dashboard({ searchParams });
      render(component);

      // Check that stats are rendered in a grid with proper styling
      const statsContainer = screen.getByText('Total Campaigns').closest('.grid');
      expect(statsContainer).toHaveClass('md:grid-cols-4', 'gap-6');
    });
  });

  describe('Draft campaigns section', () => {
    beforeEach(() => {
      mockVerifySession.mockResolvedValue({ userId: 'user-1' });
      mockPrismaCampaignFindMany.mockResolvedValue(mockCampaigns);
    });

    it('should render draft campaigns section', async () => {
      const searchParams = Promise.resolve({});
      const component = await Dashboard({ searchParams });
      render(component);

      expect(screen.getByText('Draft Campaigns (1)')).toBeInTheDocument();
      expect(screen.getByText('AI Platform')).toBeInTheDocument();
      expect(screen.getByText('Revolutionary AI platform for businesses')).toBeInTheDocument();
    });

    it('should display draft campaign information correctly', async () => {
      const searchParams = Promise.resolve({});
      const component = await Dashboard({ searchParams });
      render(component);

      // Check draft campaign details
      expect(screen.getByText('Draft')).toBeInTheDocument();
      expect(screen.getByText('$100,000')).toBeInTheDocument(); // Goal
      expect(screen.getByText('3')).toBeInTheDocument(); // Milestones count
    });

    it('should render draft campaign action buttons', async () => {
      const searchParams = Promise.resolve({});
      const component = await Dashboard({ searchParams });
      render(component);

      const editLink = screen.getByRole('link', { name: 'Edit' });
      const previewLink = screen.getByRole('link', { name: 'Preview' });

      expect(editLink).toHaveAttribute('href', '/campaigns/campaign-1/edit');
      expect(previewLink).toHaveAttribute('href', '/campaigns/campaign-1');
    });
  });

  describe('Live campaigns section', () => {
    beforeEach(() => {
      mockVerifySession.mockResolvedValue({ userId: 'user-1' });
      mockPrismaCampaignFindMany.mockResolvedValue(mockCampaigns);
    });

    it('should render live campaigns section', async () => {
      const searchParams = Promise.resolve({});
      const component = await Dashboard({ searchParams });
      render(component);

      expect(screen.getByText('Live Campaigns (1)')).toBeInTheDocument();
      expect(screen.getByText('Analytics Tool')).toBeInTheDocument();
      expect(screen.getByText('Advanced analytics for enterprises')).toBeInTheDocument();
    });

    it('should display live campaign progress correctly', async () => {
      const searchParams = Promise.resolve({});
      const component = await Dashboard({ searchParams });
      render(component);

      expect(screen.getByText('Live')).toBeInTheDocument();
      expect(screen.getByText('30%')).toBeInTheDocument(); // Progress: 45000/150000 = 30%
      expect(screen.getByText('$45,000')).toBeInTheDocument(); // Raised amount
      expect(screen.getByText('of $150,000')).toBeInTheDocument(); // Goal amount
      expect(screen.getByText('25 backers')).toBeInTheDocument();
    });

    it('should render live campaign progress bar', async () => {
      const searchParams = Promise.resolve({});
      const component = await Dashboard({ searchParams });
      render(component);

      // Progress bar should have width style set to 30%
      const progressBar = screen.getByText('Analytics Tool').closest('.bg-white')?.querySelector('.bg-brand');
      expect(progressBar).toBeInTheDocument();
    });

    it('should render live campaign action buttons', async () => {
      const searchParams = Promise.resolve({});
      const component = await Dashboard({ searchParams });
      render(component);

      const manageLink = screen.getByRole('link', { name: 'Manage' });
      const viewLink = screen.getByRole('link', { name: 'View' });

      expect(manageLink).toHaveAttribute('href', '/campaigns/campaign-2/edit');
      expect(viewLink).toHaveAttribute('href', '/campaigns/campaign-2');
    });
  });

  describe('Completed campaigns section', () => {
    beforeEach(() => {
      mockVerifySession.mockResolvedValue({ userId: 'user-1' });
      mockPrismaCampaignFindMany.mockResolvedValue(mockCampaigns);
    });

    it('should render completed campaigns section', async () => {
      const searchParams = Promise.resolve({});
      const component = await Dashboard({ searchParams });
      render(component);

      expect(screen.getByText('Completed Campaigns (1)')).toBeInTheDocument();
      expect(screen.getByText('Productivity App')).toBeInTheDocument();
      expect(screen.getByText('Boost team productivity')).toBeInTheDocument();
    });

    it('should display completed campaign information correctly', async () => {
      const searchParams = Promise.resolve({});
      const component = await Dashboard({ searchParams });
      render(component);

      expect(screen.getByText('Completed')).toBeInTheDocument();
      expect(screen.getByText('$80,000')).toBeInTheDocument(); // Raised amount
      expect(screen.getByText('40 backers')).toBeInTheDocument();
    });

    it('should handle funded campaigns vs completed campaigns', async () => {
      const campaignsWithFunded = [
        ...mockCampaigns,
        {
          id: 'campaign-4',
          title: 'Funded Campaign',
          summary: 'This campaign is funded',
          status: 'funded',
          raisedDollars: 60000,
          fundingGoalDollars: 50000,
          createdAt: new Date('2024-01-10'),
          _count: { pledges: 30, comments: 12, milestones: 4 },
        },
      ];

      mockPrismaCampaignFindMany.mockResolvedValue(campaignsWithFunded);

      const searchParams = Promise.resolve({});
      const component = await Dashboard({ searchParams });
      render(component);

      expect(screen.getByText('Completed Campaigns (2)')).toBeInTheDocument();
      expect(screen.getByText('Funded Campaign')).toBeInTheDocument();
      expect(screen.getByText('Funded')).toBeInTheDocument(); // Status badge for funded campaign
    });

    it('should render completed campaign view link', async () => {
      const searchParams = Promise.resolve({});
      const component = await Dashboard({ searchParams });
      render(component);

      const viewLink = screen.getByRole('link', { name: 'View Campaign' });
      expect(viewLink).toHaveAttribute('href', '/campaigns/campaign-3');
    });
  });

  describe('Success message handling', () => {
    beforeEach(() => {
      mockVerifySession.mockResolvedValue({ userId: 'user-1' });
      mockPrismaCampaignFindMany.mockResolvedValue(mockCampaigns);
    });

    it('should display success message for campaign deletion', async () => {
      const searchParams = Promise.resolve({ success: 'campaign-deleted' });
      const component = await Dashboard({ searchParams });
      render(component);

      expect(screen.getByText('Campaign deleted successfully.')).toBeInTheDocument();
    });

    it('should not display success message when no success parameter', async () => {
      const searchParams = Promise.resolve({});
      const component = await Dashboard({ searchParams });
      render(component);

      expect(screen.queryByText('Campaign deleted successfully.')).not.toBeInTheDocument();
    });
  });

  describe('Data fetching', () => {
    beforeEach(() => {
      mockVerifySession.mockResolvedValue({ userId: 'user-1' });
    });

    it('should fetch campaigns with correct parameters', async () => {
      mockPrismaCampaignFindMany.mockResolvedValue(mockCampaigns);

      const searchParams = Promise.resolve({});
      await Dashboard({ searchParams });

      expect(mockPrismaCampaignFindMany).toHaveBeenCalledWith({
        where: { makerId: 'user-1' },
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: {
              pledges: true,
              comments: true,
              milestones: true,
            },
          },
        },
      });
    });

    it('should handle database errors gracefully', async () => {
      mockPrismaCampaignFindMany.mockRejectedValue(new Error('Database connection failed'));

      const searchParams = Promise.resolve({});

      await expect(Dashboard({ searchParams })).rejects.toThrow('Database connection failed');
    });
  });

  describe('Edge cases and calculations', () => {
    beforeEach(() => {
      mockVerifySession.mockResolvedValue({ userId: 'user-1' });
    });

    it('should handle campaigns with zero funding goals', async () => {
      const edgeCaseCampaigns = [
        {
          id: 'campaign-edge',
          title: 'Zero Goal Campaign',
          summary: 'Campaign with zero goal',
          status: 'live',
          raisedDollars: 1000,
          fundingGoalDollars: 0,
          createdAt: new Date('2024-02-01'),
          _count: { pledges: 5, comments: 2, milestones: 1 },
        },
      ];

      mockPrismaCampaignFindMany.mockResolvedValue(edgeCaseCampaigns);

      const searchParams = Promise.resolve({});
      const component = await Dashboard({ searchParams });
      render(component);

      expect(screen.getByText('Zero Goal Campaign')).toBeInTheDocument();
      // Should not crash with division by zero
    });

    it('should handle campaigns with over 100% funding', async () => {
      const overFundedCampaigns = [
        {
          id: 'campaign-over',
          title: 'Over Funded Campaign',
          summary: 'Campaign that exceeded its goal',
          status: 'live',
          raisedDollars: 120000,
          fundingGoalDollars: 100000,
          createdAt: new Date('2024-02-01'),
          _count: { pledges: 50, comments: 20, milestones: 3 },
        },
      ];

      mockPrismaCampaignFindMany.mockResolvedValue(overFundedCampaigns);

      const searchParams = Promise.resolve({});
      const component = await Dashboard({ searchParams });
      render(component);

      expect(screen.getByText('120%')).toBeInTheDocument(); // Should show over 100%
    });

    it('should handle empty pledge and comment counts', async () => {
      const emptyCampaigns = [
        {
          id: 'campaign-empty',
          title: 'Empty Campaign',
          summary: 'Campaign with no activity',
          status: 'draft',
          raisedDollars: 0,
          fundingGoalDollars: 50000,
          createdAt: new Date('2024-02-01'),
          _count: { pledges: 0, comments: 0, milestones: 0 },
        },
      ];

      mockPrismaCampaignFindMany.mockResolvedValue(emptyCampaigns);

      const searchParams = Promise.resolve({});
      const component = await Dashboard({ searchParams });
      render(component);

      expect(screen.getByText('Empty Campaign')).toBeInTheDocument();
      expect(screen.getByText('$0')).toBeInTheDocument(); // Total raised
      expect(screen.getByText('0')).toBeInTheDocument(); // Backers/comments/milestones
    });
  });

  describe('Responsive design and accessibility', () => {
    beforeEach(() => {
      mockVerifySession.mockResolvedValue({ userId: 'user-1' });
      mockPrismaCampaignFindMany.mockResolvedValue(mockCampaigns);
    });

    it('should have proper heading structure', async () => {
      const searchParams = Promise.resolve({});
      const component = await Dashboard({ searchParams });
      render(component);

      const h1 = screen.getByRole('heading', { level: 1 });
      const h2s = screen.getAllByRole('heading', { level: 2 });

      expect(h1).toBeInTheDocument();
      expect(h2s.length).toBeGreaterThan(0);
    });

    it('should render responsive grid layouts', async () => {
      const searchParams = Promise.resolve({});
      const component = await Dashboard({ searchParams });
      render(component);

      // Stats grid
      const statsGrid = screen.getByText('Total Campaigns').closest('.grid');
      expect(statsGrid).toHaveClass('md:grid-cols-4', 'gap-6');

      // Campaign cards grids
      const campaignGrids = document.querySelectorAll('.grid.md\\:grid-cols-2.lg\\:grid-cols-3');
      expect(campaignGrids.length).toBeGreaterThan(0);
    });

    it('should have accessible link text', async () => {
      const searchParams = Promise.resolve({});
      const component = await Dashboard({ searchParams });
      render(component);

      // All links should have descriptive text
      const links = screen.getAllByRole('link');
      links.forEach(link => {
        expect(link).toHaveTextContent(/\S+/); // Non-empty text
      });
    });
  });

  describe('Date formatting', () => {
    beforeEach(() => {
      mockVerifySession.mockResolvedValue({ userId: 'user-1' });
      mockPrismaCampaignFindMany.mockResolvedValue(mockCampaigns);
    });

    it('should format creation dates correctly', async () => {
      const searchParams = Promise.resolve({});
      const component = await Dashboard({ searchParams });
      render(component);

      // Check that dates are formatted (exact format may vary by locale)
      expect(screen.getByText('1/15/2024')).toBeInTheDocument(); // campaign-1
      expect(screen.getByText('2/1/2024')).toBeInTheDocument(); // campaign-2
      expect(screen.getByText('1/1/2024')).toBeInTheDocument(); // campaign-3
    });
  });
});