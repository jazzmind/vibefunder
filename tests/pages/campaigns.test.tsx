import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import Campaigns from '@/app/campaigns/page';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { DEMO_CAMPAIGNS } from '@/app/demo/campaigns';

// Mock dependencies
jest.mock('@/lib/auth');
jest.mock('@/lib/db', () => ({
  prisma: {
    campaign: {
      findMany: jest.fn(),
    },
  },
}));

jest.mock('@/app/demo/campaigns', () => ({
  DEMO_CAMPAIGNS: [
    {
      id: 'demo-1',
      title: 'Demo AI Tool',
      summary: 'An innovative AI solution',
      status: 'live',
      raisedDollars: 15000,
      fundingGoalDollars: 50000,
      deployModes: ['saas', 'on-prem'],
      sectors: ['ai', 'productivity'],
      createdAt: new Date('2024-01-01'),
      endsAt: new Date('2024-12-31'),
      maker: { name: 'Demo Creator', email: 'creator@example.com' },
      _count: { pledges: 25, comments: 8 },
    },
    {
      id: 'demo-2',
      title: 'Demo Analytics Platform',
      summary: 'Advanced analytics for businesses',
      status: 'funded',
      raisedDollars: 75000,
      fundingGoalDollars: 60000,
      deployModes: ['saas'],
      sectors: ['analytics', 'business'],
      createdAt: new Date('2024-02-01'),
      endsAt: new Date('2024-11-30'),
      maker: { name: 'Analytics Team', email: 'team@analytics.com' },
      _count: { pledges: 50, comments: 15 },
    },
  ],
}));

// Mock the search component
jest.mock('@/app/campaigns/search', () => {
  return {
    CampaignSearch: () => <div data-testid="campaign-search">Search Component</div>,
  };
});

// Mock Next.js components
jest.mock('next/link', () => {
  return ({ children, href, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  );
});

const mockAuth = auth as jest.MockedFunction<typeof auth>;
const mockPrismaFindMany = prisma.campaign.findMany as jest.MockedFunction<typeof prisma.campaign.findMany>;

describe('Campaigns Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('For authenticated users', () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue({
        user: { id: 'user-1', email: 'user@example.com', roles: ['user'] }
      } as any);
    });

    it('should render campaigns page for authenticated users', async () => {
      const mockCampaigns = [
        {
          id: 'campaign-1',
          title: 'Test Campaign',
          summary: 'A test campaign',
          status: 'live',
          raisedDollars: 10000,
          fundingGoalDollars: 50000,
          deployModes: ['saas'],
          sectors: ['tech'],
          createdAt: new Date(),
          endsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
          maker: { name: 'Test Maker', email: 'maker@example.com' },
          _count: { pledges: 10, comments: 5 },
        },
      ];

      mockPrismaFindMany.mockResolvedValue(mockCampaigns);

      const searchParams = Promise.resolve({});
      const component = await Campaigns({ searchParams });
      render(component);

      expect(screen.getByText('Discover Campaigns')).toBeInTheDocument();
      expect(screen.getByText('Test Campaign')).toBeInTheDocument();
      expect(screen.getByText('A test campaign')).toBeInTheDocument();
    });

    it('should handle search functionality', async () => {
      const mockCampaigns = [
        {
          id: 'campaign-1',
          title: 'AI Search Tool',
          summary: 'An AI-powered search solution',
          status: 'live',
          raisedDollars: 20000,
          fundingGoalDollars: 100000,
          deployModes: ['saas'],
          sectors: ['ai'],
          createdAt: new Date(),
          endsAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days from now
          maker: { name: 'AI Team', email: 'ai@example.com' },
          _count: { pledges: 15, comments: 3 },
        },
      ];

      mockPrismaFindMany.mockResolvedValue(mockCampaigns);

      const searchParams = Promise.resolve({ search: 'AI' });
      const component = await Campaigns({ searchParams });
      render(component);

      expect(screen.getByText('Search Results for "AI"')).toBeInTheDocument();
      expect(screen.getByText('Found 1 campaign')).toBeInTheDocument();
      expect(screen.getByText('AI Search Tool')).toBeInTheDocument();
    });

    it('should handle status filtering', async () => {
      const mockCampaigns = [
        {
          id: 'campaign-1',
          title: 'Live Campaign',
          summary: 'A live campaign',
          status: 'live',
          raisedDollars: 5000,
          fundingGoalDollars: 25000,
          deployModes: ['saas'],
          sectors: ['tech'],
          createdAt: new Date(),
          endsAt: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
          maker: { name: 'Live Maker', email: 'live@example.com' },
          _count: { pledges: 8, comments: 2 },
        },
      ];

      mockPrismaFindMany.mockResolvedValue(mockCampaigns);

      const searchParams = Promise.resolve({ status: 'live' });
      const component = await Campaigns({ searchParams });
      render(component);

      expect(screen.getByText('Live Campaign')).toBeInTheDocument();
      expect(screen.getByText('Live')).toBeInTheDocument();
    });

    it('should handle sorting by funding', async () => {
      const mockCampaigns = [
        {
          id: 'campaign-1',
          title: 'High Funded Campaign',
          summary: 'Well funded campaign',
          status: 'live',
          raisedDollars: 50000,
          fundingGoalDollars: 100000,
          deployModes: ['saas'],
          sectors: ['fintech'],
          createdAt: new Date(),
          endsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          maker: { name: 'Fintech Team', email: 'fintech@example.com' },
          _count: { pledges: 40, comments: 12 },
        },
        {
          id: 'campaign-2',
          title: 'Lower Funded Campaign',
          summary: 'Less funded campaign',
          status: 'live',
          raisedDollars: 10000,
          fundingGoalDollars: 50000,
          deployModes: ['on-prem'],
          sectors: ['enterprise'],
          createdAt: new Date(),
          endsAt: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
          maker: { name: 'Enterprise Team', email: 'enterprise@example.com' },
          _count: { pledges: 15, comments: 4 },
        },
      ];

      mockPrismaFindMany.mockResolvedValue(mockCampaigns);

      const searchParams = Promise.resolve({ sort: 'funding' });
      const component = await Campaigns({ searchParams });
      render(component);

      expect(screen.getByText('High Funded Campaign')).toBeInTheDocument();
      expect(screen.getByText('Lower Funded Campaign')).toBeInTheDocument();
    });

    it('should show empty state when no campaigns found', async () => {
      mockPrismaFindMany.mockResolvedValue([]);

      const searchParams = Promise.resolve({ search: 'nonexistent' });
      const component = await Campaigns({ searchParams });
      render(component);

      expect(screen.getByText('Search Results for "nonexistent"')).toBeInTheDocument();
      expect(screen.getByText('Found 0 campaigns')).toBeInTheDocument();
      expect(screen.getByText('No campaigns found')).toBeInTheDocument();
      expect(screen.getByText('Try adjusting your search or filters to find what you\'re looking for.')).toBeInTheDocument();
    });

    it('should render campaign cards with correct information', async () => {
      const mockCampaigns = [
        {
          id: 'campaign-1',
          title: 'Test Campaign',
          summary: 'A detailed test campaign',
          status: 'live',
          raisedDollars: 30000,
          fundingGoalDollars: 100000,
          deployModes: ['saas', 'on-prem'],
          sectors: ['ai', 'automation'],
          createdAt: new Date(),
          endsAt: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 days
          maker: { name: 'Test Creator', email: 'creator@test.com' },
          _count: { pledges: 25, comments: 8 },
        },
      ];

      mockPrismaFindMany.mockResolvedValue(mockCampaigns);

      const searchParams = Promise.resolve({});
      const component = await Campaigns({ searchParams });
      render(component);

      // Check campaign card content
      expect(screen.getByText('Test Campaign')).toBeInTheDocument();
      expect(screen.getByText('A detailed test campaign')).toBeInTheDocument();
      expect(screen.getByText('$30,000')).toBeInTheDocument();
      expect(screen.getByText('of $100,000')).toBeInTheDocument();
      expect(screen.getByText('30% funded')).toBeInTheDocument();
      expect(screen.getByText('by Test Creator')).toBeInTheDocument();
      expect(screen.getByText('25')).toBeInTheDocument(); // backers
      expect(screen.getByText('8')).toBeInTheDocument(); // comments
      expect(screen.getByText('15 days left')).toBeInTheDocument();
    });

    it('should handle deployment mode filtering', async () => {
      const mockCampaigns = [
        {
          id: 'campaign-1',
          title: 'SaaS Campaign',
          summary: 'A SaaS solution',
          status: 'live',
          raisedDollars: 25000,
          fundingGoalDollars: 75000,
          deployModes: ['saas'],
          sectors: ['productivity'],
          createdAt: new Date(),
          endsAt: new Date(Date.now() + 40 * 24 * 60 * 60 * 1000),
          maker: { name: 'SaaS Team', email: 'saas@example.com' },
          _count: { pledges: 20, comments: 6 },
        },
      ];

      mockPrismaFindMany.mockResolvedValue(mockCampaigns);

      const searchParams = Promise.resolve({ deployment: 'saas' });
      const component = await Campaigns({ searchParams });
      render(component);

      expect(screen.getByText('SaaS Campaign')).toBeInTheDocument();
      expect(screen.getByText('SAAS')).toBeInTheDocument();
    });

    it('should render create campaign section for authenticated users', async () => {
      mockPrismaFindMany.mockResolvedValue([]);

      const searchParams = Promise.resolve({});
      const component = await Campaigns({ searchParams });
      render(component);

      expect(screen.getByText('Ready to launch your campaign?')).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /create campaign/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /learn how it works/i })).toBeInTheDocument();
    });
  });

  describe('For non-authenticated users (demo mode)', () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue(null);
    });

    it('should render demo campaigns for non-authenticated users', async () => {
      const searchParams = Promise.resolve({});
      const component = await Campaigns({ searchParams });
      render(component);

      expect(screen.getByText('Discover Campaigns')).toBeInTheDocument();
      expect(screen.getByText('Demo AI Tool')).toBeInTheDocument();
      expect(screen.getByText('Demo Analytics Platform')).toBeInTheDocument();
    });

    it('should show signup prompt for non-authenticated users', async () => {
      const searchParams = Promise.resolve({});
      const component = await Campaigns({ searchParams });
      render(component);

      expect(screen.getByText('Want to see more campaigns and back projects?')).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /join the community/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /view demo campaigns/i })).toBeInTheDocument();
    });

    it('should filter demo campaigns by search', async () => {
      const searchParams = Promise.resolve({ search: 'AI' });
      const component = await Campaigns({ searchParams });
      render(component);

      expect(screen.getByText('Search Results for "AI"')).toBeInTheDocument();
      expect(screen.getByText('Demo AI Tool')).toBeInTheDocument();
      expect(screen.queryByText('Demo Analytics Platform')).not.toBeInTheDocument();
    });

    it('should filter demo campaigns by status', async () => {
      const searchParams = Promise.resolve({ status: 'funded' });
      const component = await Campaigns({ searchParams });
      render(component);

      expect(screen.getByText('Demo Analytics Platform')).toBeInTheDocument();
      expect(screen.queryByText('Demo AI Tool')).not.toBeInTheDocument();
    });

    it('should sort demo campaigns by funding', async () => {
      const searchParams = Promise.resolve({ sort: 'funding' });
      const component = await Campaigns({ searchParams });
      render(component);

      // Should show higher funded campaign first
      const campaigns = screen.getAllByText(/Demo/);
      expect(campaigns[0]).toHaveTextContent('Demo Analytics Platform'); // $75,000
    });

    it('should render interest section for non-authenticated users', async () => {
      const searchParams = Promise.resolve({});
      const component = await Campaigns({ searchParams });
      render(component);

      expect(screen.getByText('Interested in creating your own campaign?')).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /join vibefunder/i })).toBeInTheDocument();
    });
  });

  describe('Search and filtering', () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue({
        user: { id: 'user-1', email: 'user@example.com', roles: ['user'] }
      } as any);
    });

    it('should handle multiple search terms', async () => {
      const mockCampaigns = [
        {
          id: 'campaign-1',
          title: 'AI Machine Learning Tool',
          summary: 'Advanced machine learning platform',
          status: 'live',
          raisedDollars: 35000,
          fundingGoalDollars: 80000,
          deployModes: ['saas'],
          sectors: ['ai', 'ml'],
          createdAt: new Date(),
          endsAt: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000),
          maker: { name: 'ML Team', email: 'ml@example.com' },
          _count: { pledges: 30, comments: 10 },
        },
      ];

      mockPrismaFindMany.mockResolvedValue(mockCampaigns);

      const searchParams = Promise.resolve({ search: 'machine learning' });
      const component = await Campaigns({ searchParams });
      render(component);

      expect(screen.getByText('Search Results for "machine learning"')).toBeInTheDocument();
      expect(screen.getByText('AI Machine Learning Tool')).toBeInTheDocument();
    });

    it('should show progress calculation correctly', async () => {
      const mockCampaigns = [
        {
          id: 'campaign-1',
          title: 'Progress Test Campaign',
          summary: 'Testing progress calculation',
          status: 'live',
          raisedDollars: 25000,
          fundingGoalDollars: 50000,
          deployModes: ['saas'],
          sectors: ['test'],
          createdAt: new Date(),
          endsAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
          maker: { name: 'Test Team', email: 'test@example.com' },
          _count: { pledges: 12, comments: 3 },
        },
      ];

      mockPrismaFindMany.mockResolvedValue(mockCampaigns);

      const searchParams = Promise.resolve({});
      const component = await Campaigns({ searchParams });
      render(component);

      expect(screen.getByText('50% funded')).toBeInTheDocument();
    });

    it('should handle edge case of over-funded campaigns', async () => {
      const mockCampaigns = [
        {
          id: 'campaign-1',
          title: 'Over Funded Campaign',
          summary: 'Exceeded funding goal',
          status: 'funded',
          raisedDollars: 120000,
          fundingGoalDollars: 100000,
          deployModes: ['saas'],
          sectors: ['success'],
          createdAt: new Date(),
          endsAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
          maker: { name: 'Success Team', email: 'success@example.com' },
          _count: { pledges: 60, comments: 20 },
        },
      ];

      mockPrismaFindMany.mockResolvedValue(mockCampaigns);

      const searchParams = Promise.resolve({});
      const component = await Campaigns({ searchParams });
      render(component);

      expect(screen.getByText('120% funded')).toBeInTheDocument();
    });
  });

  describe('Accessibility and UX', () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue({
        user: { id: 'user-1', email: 'user@example.com', roles: ['user'] }
      } as any);
    });

    it('should have proper heading structure', async () => {
      mockPrismaFindMany.mockResolvedValue([]);

      const searchParams = Promise.resolve({});
      const component = await Campaigns({ searchParams });
      render(component);

      const h1 = screen.getByRole('heading', { level: 1 });
      const h3s = screen.getAllByRole('heading', { level: 3 });

      expect(h1).toBeInTheDocument();
      expect(h3s.length).toBeGreaterThan(0);
    });

    it('should render campaign search component', async () => {
      mockPrismaFindMany.mockResolvedValue([]);

      const searchParams = Promise.resolve({});
      const component = await Campaigns({ searchParams });
      render(component);

      expect(screen.getByTestId('campaign-search')).toBeInTheDocument();
    });

    it('should handle campaigns with missing images gracefully', async () => {
      const mockCampaigns = [
        {
          id: 'campaign-1',
          title: 'No Image Campaign',
          summary: 'Campaign without an image',
          status: 'live',
          raisedDollars: 15000,
          fundingGoalDollars: 40000,
          deployModes: ['saas'],
          sectors: ['tech'],
          createdAt: new Date(),
          endsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          maker: { name: 'Image-less Team', email: 'noimage@example.com' },
          _count: { pledges: 18, comments: 7 },
        },
      ];

      mockPrismaFindMany.mockResolvedValue(mockCampaigns);

      const searchParams = Promise.resolve({});
      const component = await Campaigns({ searchParams });
      render(component);

      expect(screen.getByText('No Image Campaign')).toBeInTheDocument();
      // Should still render campaign card without image
      expect(screen.getByText('Campaign without an image')).toBeInTheDocument();
    });
  });
});