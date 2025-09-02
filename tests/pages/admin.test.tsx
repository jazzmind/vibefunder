import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { redirect } from 'next/navigation';
import AdminDashboard from '@/app/admin/page';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

// Mock dependencies
jest.mock('next/navigation', () => ({
  redirect: jest.fn(),
}));

jest.mock('@/lib/auth');

jest.mock('@/lib/db', () => ({
  prisma: {
    user: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
    campaign: {
      count: jest.fn(),
      aggregate: jest.fn(),
      findMany: jest.fn(),
    },
    pledge: {
      count: jest.fn(),
    },
  },
}));

// Mock Next.js Link component
jest.mock('next/link', () => {
  return ({ children, href, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  );
});

const mockAuth = auth as jest.MockedFunction<typeof auth>;
const mockRedirect = redirect as jest.MockedFunction<typeof redirect>;
const mockUserCount = prisma.user.count as jest.MockedFunction<typeof prisma.user.count>;
const mockUserFindMany = prisma.user.findMany as jest.MockedFunction<typeof prisma.user.findMany>;
const mockCampaignCount = prisma.campaign.count as jest.MockedFunction<typeof prisma.campaign.count>;
const mockCampaignAggregate = prisma.campaign.aggregate as jest.MockedFunction<typeof prisma.campaign.aggregate>;
const mockCampaignFindMany = prisma.campaign.findMany as jest.MockedFunction<typeof prisma.campaign.findMany>;
const mockPledgeCount = prisma.pledge.count as jest.MockedFunction<typeof prisma.pledge.count>;

describe('Admin Dashboard', () => {
  const mockRecentCampaigns = [
    {
      id: 'campaign-1',
      title: 'AI Platform Campaign',
      status: 'live',
      createdAt: new Date('2024-02-01'),
      maker: { name: 'John Doe', email: 'john@example.com' },
    },
    {
      id: 'campaign-2',
      title: 'Productivity Tool',
      status: 'draft',
      createdAt: new Date('2024-01-28'),
      maker: { name: 'Jane Smith', email: 'jane@example.com' },
    },
    {
      id: 'campaign-3',
      title: 'Analytics Dashboard',
      status: 'completed',
      createdAt: new Date('2024-01-25'),
      maker: { name: null, email: 'creator@analytics.com' },
    },
  ];

  const mockRecentUsers = [
    {
      id: 'user-1',
      name: 'Alice Johnson',
      email: 'alice@example.com',
      roles: ['user'],
      createdAt: new Date('2024-02-10'),
    },
    {
      id: 'user-2',
      name: null,
      email: 'bob@example.com',
      roles: ['user', 'maker'],
      createdAt: new Date('2024-02-08'),
    },
    {
      id: 'user-3',
      name: 'Charlie Admin',
      email: 'charlie@admin.com',
      roles: ['admin'],
      createdAt: new Date('2024-02-05'),
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock default database responses
    mockUserCount.mockResolvedValue(150);
    mockCampaignCount.mockResolvedValue(45);
    mockCampaignAggregate.mockResolvedValue({ _sum: { raisedDollars: 2500000 } });
    mockPledgeCount.mockResolvedValue(320);
    mockCampaignFindMany.mockResolvedValue(mockRecentCampaigns);
    mockUserFindMany.mockResolvedValue(mockRecentUsers);
  });

  describe('Authentication and authorization', () => {
    it('should redirect to signin when not authenticated', async () => {
      mockAuth.mockResolvedValue(null);

      await AdminDashboard();

      expect(mockRedirect).toHaveBeenCalledWith('/signin');
    });

    it('should redirect to signin when user lacks admin role', async () => {
      mockAuth.mockResolvedValue({
        user: { id: 'user-1', email: 'user@example.com', roles: ['user'] }
      } as any);

      await AdminDashboard();

      expect(mockRedirect).toHaveBeenCalledWith('/signin');
    });

    it('should allow access for admin users', async () => {
      mockAuth.mockResolvedValue({
        user: { id: 'admin-1', email: 'admin@example.com', roles: ['admin'] }
      } as any);

      const component = await AdminDashboard();
      render(component);

      expect(screen.getByRole('heading', { name: /admin dashboard/i })).toBeInTheDocument();
      expect(mockRedirect).not.toHaveBeenCalled();
    });

    it('should allow access for users with multiple roles including admin', async () => {
      mockAuth.mockResolvedValue({
        user: { id: 'admin-1', email: 'admin@example.com', roles: ['user', 'admin', 'maker'] }
      } as any);

      const component = await AdminDashboard();
      render(component);

      expect(screen.getByRole('heading', { name: /admin dashboard/i })).toBeInTheDocument();
    });
  });

  describe('Dashboard rendering for admin users', () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue({
        user: { id: 'admin-1', email: 'admin@example.com', roles: ['admin'] }
      } as any);
    });

    it('should render admin dashboard header', async () => {
      const component = await AdminDashboard();
      render(component);

      expect(screen.getByRole('heading', { name: /admin dashboard/i })).toBeInTheDocument();
      expect(screen.getByText('Manage users, campaigns, and platform analytics')).toBeInTheDocument();
    });

    it('should render quick action cards', async () => {
      const component = await AdminDashboard();
      render(component);

      expect(screen.getByText('Manage Users')).toBeInTheDocument();
      expect(screen.getByText('All Campaigns')).toBeInTheDocument();
      expect(screen.getByText('Organizations')).toBeInTheDocument();
      expect(screen.getByText('Total Raised')).toBeInTheDocument();
    });

    it('should display correct statistics in quick actions', async () => {
      const component = await AdminDashboard();
      render(component);

      expect(screen.getByText('150')).toBeInTheDocument(); // Total users
      expect(screen.getByText('45')).toBeInTheDocument(); // Total campaigns
      expect(screen.getByText('$2,500,000')).toBeInTheDocument(); // Total raised
    });

    it('should render quick action links correctly', async () => {
      const component = await AdminDashboard();
      render(component);

      const userLink = screen.getByRole('link', { name: /manage users/i });
      const campaignLink = screen.getByRole('link', { name: /all campaigns/i });
      const orgLink = screen.getByRole('link', { name: /organizations/i });

      expect(userLink).toHaveAttribute('href', '/admin/users');
      expect(campaignLink).toHaveAttribute('href', '/admin/campaigns');
      expect(orgLink).toHaveAttribute('href', '/admin/organizations');
    });
  });

  describe('Statistics overview', () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue({
        user: { id: 'admin-1', email: 'admin@example.com', roles: ['admin'] }
      } as any);

      // Mock different counts for different statuses
      mockCampaignCount
        .mockResolvedValueOnce(45) // Total campaigns
        .mockResolvedValueOnce(12) // Active campaigns
        .mockResolvedValueOnce(8)  // Draft campaigns
        .mockResolvedValueOnce(12) // Live campaigns
        .mockResolvedValueOnce(15); // Completed campaigns
    });

    it('should render campaign status statistics', async () => {
      const component = await AdminDashboard();
      render(component);

      expect(screen.getByText('Campaign Status')).toBeInTheDocument();
      expect(screen.getByText('Draft Campaigns')).toBeInTheDocument();
      expect(screen.getByText('Live Campaigns')).toBeInTheDocument();
      expect(screen.getByText('Completed Campaigns')).toBeInTheDocument();
      expect(screen.getByText('Total Pledges')).toBeInTheDocument();

      // Check the numbers
      expect(screen.getByText('8')).toBeInTheDocument(); // Draft campaigns
      expect(screen.getByText('12')).toBeInTheDocument(); // Live campaigns
      expect(screen.getByText('15')).toBeInTheDocument(); // Completed campaigns
      expect(screen.getByText('320')).toBeInTheDocument(); // Total pledges
    });

    it('should render platform health statistics', async () => {
      const component = await AdminDashboard();
      render(component);

      expect(screen.getByText('Platform Health')).toBeInTheDocument();
      expect(screen.getByText('Active Campaigns')).toBeInTheDocument();
      expect(screen.getByText('Success Rate')).toBeInTheDocument();
      expect(screen.getByText('Avg. Campaign Size')).toBeInTheDocument();
    });

    it('should calculate success rate correctly', async () => {
      const component = await AdminDashboard();
      render(component);

      // Success rate should be completed/total = 15/45 = 33%
      expect(screen.getByText('33%')).toBeInTheDocument();
    });

    it('should calculate average campaign size', async () => {
      const component = await AdminDashboard();
      render(component);

      // Avg size should be total raised / total campaigns = 2500000/45 ≈ 55556
      expect(screen.getByText('$55,556')).toBeInTheDocument();
    });
  });

  describe('Recent campaigns section', () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue({
        user: { id: 'admin-1', email: 'admin@example.com', roles: ['admin'] }
      } as any);
    });

    it('should render recent campaigns section', async () => {
      const component = await AdminDashboard();
      render(component);

      expect(screen.getByText('Recent Campaigns')).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /view all/i })).toHaveAttribute('href', '/admin/campaigns');
    });

    it('should display recent campaign information', async () => {
      const component = await AdminDashboard();
      render(component);

      expect(screen.getByText('AI Platform Campaign')).toBeInTheDocument();
      expect(screen.getByText('Productivity Tool')).toBeInTheDocument();
      expect(screen.getByText('Analytics Dashboard')).toBeInTheDocument();

      // Check makers
      expect(screen.getByText('by John Doe')).toBeInTheDocument();
      expect(screen.getByText('by Jane Smith')).toBeInTheDocument();
      expect(screen.getByText('by creator@analytics.com')).toBeInTheDocument(); // No name, shows email
    });

    it('should render campaign edit links', async () => {
      const component = await AdminDashboard();
      render(component);

      const editLinks = screen.getAllByRole('link', { name: /edit/i });
      expect(editLinks).toHaveLength(3);
      expect(editLinks[0]).toHaveAttribute('href', '/campaigns/campaign-1/edit');
      expect(editLinks[1]).toHaveAttribute('href', '/campaigns/campaign-2/edit');
      expect(editLinks[2]).toHaveAttribute('href', '/campaigns/campaign-3/edit');
    });

    it('should render campaign status badges', async () => {
      const component = await AdminDashboard();
      render(component);

      expect(screen.getByText('live')).toBeInTheDocument();
      expect(screen.getByText('draft')).toBeInTheDocument();
      expect(screen.getByText('completed')).toBeInTheDocument();
    });

    it('should render campaign title links', async () => {
      const component = await AdminDashboard();
      render(component);

      const titleLinks = screen.getAllByRole('link', { name: /AI Platform Campaign|Productivity Tool|Analytics Dashboard/i });
      expect(titleLinks[0]).toHaveAttribute('href', '/campaigns/campaign-1');
      expect(titleLinks[1]).toHaveAttribute('href', '/campaigns/campaign-2');
      expect(titleLinks[2]).toHaveAttribute('href', '/campaigns/campaign-3');
    });
  });

  describe('Recent users section', () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue({
        user: { id: 'admin-1', email: 'admin@example.com', roles: ['admin'] }
      } as any);
    });

    it('should render recent users section', async () => {
      const component = await AdminDashboard();
      render(component);

      expect(screen.getByText('Recent Users')).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /view all/i })).toHaveAttribute('href', '/admin/users');
    });

    it('should display recent user information', async () => {
      const component = await AdminDashboard();
      render(component);

      expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
      expect(screen.getByText('alice@example.com')).toBeInTheDocument();
      
      expect(screen.getByText('bob')).toBeInTheDocument(); // Email prefix when no name
      expect(screen.getByText('bob@example.com')).toBeInTheDocument();
      
      expect(screen.getByText('Charlie Admin')).toBeInTheDocument();
      expect(screen.getByText('charlie@admin.com')).toBeInTheDocument();
    });

    it('should render user avatars with initials', async () => {
      const component = await AdminDashboard();
      render(component);

      expect(screen.getByText('A')).toBeInTheDocument(); // Alice Johnson
      expect(screen.getByText('b')).toBeInTheDocument(); // bob@example.com (email prefix)
      expect(screen.getByText('C')).toBeInTheDocument(); // Charlie Admin
    });

    it('should display user roles correctly', async () => {
      const component = await AdminDashboard();
      render(component);

      // Alice has ['user'] role
      const userRoles = screen.getAllByText('user');
      expect(userRoles.length).toBeGreaterThan(0);

      // Bob has ['user', 'maker'] roles
      expect(screen.getByText('maker')).toBeInTheDocument();

      // Charlie has ['admin'] role
      expect(screen.getByText('admin')).toBeInTheDocument();
    });
  });

  describe('Error handling and edge cases', () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue({
        user: { id: 'admin-1', email: 'admin@example.com', roles: ['admin'] }
      } as any);
    });

    it('should handle zero total raised gracefully', async () => {
      mockCampaignAggregate.mockResolvedValue({ _sum: { raisedDollars: null } });

      const component = await AdminDashboard();
      render(component);

      expect(screen.getByText('$0')).toBeInTheDocument();
    });

    it('should handle zero campaigns for success rate calculation', async () => {
      mockCampaignCount.mockResolvedValue(0);

      const component = await AdminDashboard();
      render(component);

      // Success rate should be 0% when no campaigns
      expect(screen.getByText('0%')).toBeInTheDocument();
    });

    it('should handle zero campaigns for average campaign size', async () => {
      mockCampaignCount.mockResolvedValue(0);

      const component = await AdminDashboard();
      render(component);

      // Average should be $0 when no campaigns
      expect(screen.getByText('$0')).toBeInTheDocument();
    });

    it('should handle empty recent campaigns list', async () => {
      mockCampaignFindMany.mockResolvedValue([]);

      const component = await AdminDashboard();
      render(component);

      expect(screen.getByText('Recent Campaigns')).toBeInTheDocument();
      // Should not crash when no recent campaigns
    });

    it('should handle empty recent users list', async () => {
      mockUserFindMany.mockResolvedValue([]);

      const component = await AdminDashboard();
      render(component);

      expect(screen.getByText('Recent Users')).toBeInTheDocument();
      // Should not crash when no recent users
    });

    it('should handle database errors gracefully', async () => {
      mockUserCount.mockRejectedValue(new Error('Database connection failed'));

      await expect(AdminDashboard()).rejects.toThrow('Database connection failed');
    });
  });

  describe('Data fetching', () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue({
        user: { id: 'admin-1', email: 'admin@example.com', roles: ['admin'] }
      } as any);
    });

    it('should fetch all required statistics in parallel', async () => {
      await AdminDashboard();

      expect(mockUserCount).toHaveBeenCalled();
      expect(mockCampaignCount).toHaveBeenCalledTimes(5); // Total, active, draft, live, completed
      expect(mockCampaignAggregate).toHaveBeenCalledWith({ _sum: { raisedDollars: true } });
      expect(mockPledgeCount).toHaveBeenCalled();
    });

    it('should fetch recent campaigns with correct parameters', async () => {
      await AdminDashboard();

      expect(mockCampaignFindMany).toHaveBeenCalledWith({
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: { maker: true },
      });
    });

    it('should fetch recent users with correct parameters', async () => {
      await AdminDashboard();

      expect(mockUserFindMany).toHaveBeenCalledWith({
        orderBy: { createdAt: 'desc' },
        take: 5,
      });
    });
  });

  describe('Responsive design and accessibility', () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue({
        user: { id: 'admin-1', email: 'admin@example.com', roles: ['admin'] }
      } as any);
    });

    it('should have proper heading structure', async () => {
      const component = await AdminDashboard();
      render(component);

      const h1 = screen.getByRole('heading', { level: 1 });
      const h3s = screen.getAllByRole('heading', { level: 3 });

      expect(h1).toBeInTheDocument();
      expect(h3s.length).toBeGreaterThan(0);
    });

    it('should render responsive grid layout', async () => {
      const component = await AdminDashboard();
      render(component);

      // Check that the main container has responsive classes
      const container = screen.getByText('Admin Dashboard').closest('.max-w-7xl');
      expect(container).toHaveClass('px-4', 'sm:px-6', 'lg:px-8');
    });

    it('should have interactive hover states for cards', async () => {
      const component = await AdminDashboard();
      render(component);

      const userCard = screen.getByRole('link', { name: /manage users/i });
      expect(userCard).toHaveClass('hover:shadow-md', 'transition-shadow');
    });
  });

  describe('Number formatting', () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue({
        user: { id: 'admin-1', email: 'admin@example.com', roles: ['admin'] }
      } as any);
    });

    it('should format large numbers correctly', async () => {
      mockUserCount.mockResolvedValue(1500);
      mockCampaignAggregate.mockResolvedValue({ _sum: { raisedDollars: 10000000 } });

      const component = await AdminDashboard();
      render(component);

      expect(screen.getByText('1,500')).toBeInTheDocument(); // User count
      expect(screen.getByText('$10,000,000')).toBeInTheDocument(); // Total raised
    });
  });
});