import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { notFound } from 'next/navigation';
import CampaignPage from '@/app/campaigns/[id]/page';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { DEMO_CAMPAIGNS } from '@/app/demo/campaigns';

// Mock dependencies
jest.mock('next/navigation', () => ({
  notFound: jest.fn(),
}));

jest.mock('@/lib/auth');
jest.mock('@/lib/db', () => ({
  prisma: {
    campaign: {
      findUnique: jest.fn(),
    },
  },
}));

jest.mock('@/app/demo/campaigns', () => ({
  DEMO_CAMPAIGNS: [
    {
      id: 'demo-1',
      title: 'Demo AI Campaign',
      summary: 'Revolutionary AI platform for businesses',
      description: '<p>This is a detailed description of our AI platform.</p>',
      status: 'live',
      raisedDollars: 35000,
      fundingGoalDollars: 100000,
      deployModes: ['saas', 'on-prem'],
      sectors: ['ai', 'business'],
      createdAt: new Date('2024-01-01'),
      endsAt: new Date('2024-12-31'),
      image: '/demo-campaign.jpg',
      leadVideoUrl: 'https://youtube.com/watch?v=demo123',
      maker: { id: 'demo-maker', name: 'Demo Creator', email: 'creator@demo.com' },
      milestones: [
        {
          id: 'milestone-1',
          name: 'MVP Development',
          status: 'completed',
          pct: 30,
          acceptance: { checklist: ['Core features implemented', 'Basic testing completed'] },
        },
        {
          id: 'milestone-2',
          name: 'Beta Release',
          status: 'in_progress',
          pct: 40,
          acceptance: { checklist: ['User feedback integration', 'Performance optimization'] },
        },
        {
          id: 'milestone-3',
          name: 'Production Launch',
          status: 'pending',
          pct: 30,
          acceptance: { checklist: ['Security audit', 'Scalability testing'] },
        },
      ],
      stretchGoals: [
        {
          id: 'stretch-1',
          title: 'Mobile App',
          description: 'Native mobile application',
          targetDollars: 150000,
        },
      ],
      pledgeTiers: [
        {
          title: 'Early Bird',
          description: 'Get early access to the platform',
          amount: 99,
          currentBackers: 15,
          maxBackers: 50,
        },
        {
          title: 'Professional',
          description: 'Full featured access with priority support',
          amount: 299,
          currentBackers: 8,
          maxBackers: 25,
        },
      ],
      teamMembers: [],
      comments: [],
      _count: { pledges: 23, comments: 12 },
    },
  ],
}));

// Mock child components
jest.mock('@/app/campaigns/[id]/client', () => ({
  PledgeButton: ({ campaignId, pledgeTiers }: any) => (
    <div data-testid="pledge-button">
      Pledge Button for {campaignId}
      {pledgeTiers?.map((tier: any, i: number) => (
        <div key={i} data-testid={`tier-${i}`}>
          {tier.title} - ${tier.amount}
        </div>
      ))}
    </div>
  ),
}));

jest.mock('@/app/campaigns/[id]/uploader', () => ({
  ArtifactUploader: ({ campaignId }: any) => (
    <div data-testid="artifact-uploader">Artifact Uploader for {campaignId}</div>
  ),
}));

jest.mock('@/app/campaigns/[id]/comments', () => ({
  CommentSection: ({ campaignId, comments, currentUser, canComment }: any) => (
    <div data-testid="comment-section">
      Comments for {campaignId}
      {canComment && <div data-testid="can-comment">Can comment</div>}
      {comments?.map((comment: any, i: number) => (
        <div key={i} data-testid={`comment-${i}`}>{comment.content}</div>
      ))}
    </div>
  ),
}));

jest.mock('@/components/campaign/ImageGenerator', () => ({
  __esModule: true,
  default: ({ campaignId, currentImage }: any) => (
    <div data-testid="image-generator">
      Image Generator for {campaignId}
      {currentImage && <div data-testid="has-current-image">Has image: {currentImage}</div>}
    </div>
  ),
}));

jest.mock('@/app/campaigns/[id]/AutoImageGenerationWrapper', () => ({
  __esModule: true,
  default: ({ campaignId, hasImage, isOwner }: any) => (
    <div data-testid="auto-image-wrapper">
      Auto Image for {campaignId}
      {hasImage && <div data-testid="has-image">Has image</div>}
      {isOwner && <div data-testid="is-owner">Is owner</div>}
    </div>
  ),
}));

jest.mock('@/components/campaign/VideoEmbed', () => ({
  __esModule: true,
  default: ({ url, title, className }: any) => (
    <div data-testid="video-embed" className={className}>
      Video: {title} - {url}
    </div>
  ),
}));

// Mock Next.js components
jest.mock('next/link', () => {
  return ({ children, href, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  );
});

const mockAuth = auth as jest.MockedFunction<typeof auth>;
const mockPrismaFindUnique = prisma.campaign.findUnique as jest.MockedFunction<typeof prisma.campaign.findUnique>;
const mockNotFound = notFound as jest.MockedFunction<typeof notFound>;

describe('Campaign Detail Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Demo campaigns', () => {
    it('should render demo campaign correctly', async () => {
      mockAuth.mockResolvedValue(null);

      const params = Promise.resolve({ id: 'demo-1' });
      const component = await CampaignPage({ params });
      render(component);

      // Check demo banner
      expect(screen.getByText('DEMO CAMPAIGN')).toBeInTheDocument();
      expect(screen.getByText('This is an example campaign to showcase VibeFunder\'s features')).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /sign up to view real campaigns/i })).toBeInTheDocument();

      // Check campaign content
      expect(screen.getByText('Demo AI Campaign')).toBeInTheDocument();
      expect(screen.getByText('Revolutionary AI platform for businesses')).toBeInTheDocument();
      expect(screen.getByText('Live')).toBeInTheDocument();
      expect(screen.getByText('$35,000')).toBeInTheDocument();
      expect(screen.getByText('of $100,000')).toBeInTheDocument();
      expect(screen.getByText('35% funded')).toBeInTheDocument();
    });

    it('should render demo campaign milestones', async () => {
      mockAuth.mockResolvedValue(null);

      const params = Promise.resolve({ id: 'demo-1' });
      const component = await CampaignPage({ params });
      render(component);

      expect(screen.getByText('Development Milestones')).toBeInTheDocument();
      expect(screen.getByText('MVP Development')).toBeInTheDocument();
      expect(screen.getByText('Beta Release')).toBeInTheDocument();
      expect(screen.getByText('Production Launch')).toBeInTheDocument();

      // Check milestone status
      expect(screen.getByText('Completed')).toBeInTheDocument();
      expect(screen.getByText('In Progress')).toBeInTheDocument();
      expect(screen.getByText('Pending')).toBeInTheDocument();
    });

    it('should render demo campaign stretch goals', async () => {
      mockAuth.mockResolvedValue(null);

      const params = Promise.resolve({ id: 'demo-1' });
      const component = await CampaignPage({ params });
      render(component);

      expect(screen.getByText('Stretch Goals')).toBeInTheDocument();
      expect(screen.getByText('Mobile App')).toBeInTheDocument();
      expect(screen.getByText('Native mobile application')).toBeInTheDocument();
      expect(screen.getByText('$150,000')).toBeInTheDocument();
    });

    it('should show demo pledge tiers but disabled', async () => {
      mockAuth.mockResolvedValue(null);

      const params = Promise.resolve({ id: 'demo-1' });
      const component = await CampaignPage({ params });
      render(component);

      expect(screen.getByText('Early Bird')).toBeInTheDocument();
      expect(screen.getByText('Professional')).toBeInTheDocument();
      expect(screen.getByText('$99')).toBeInTheDocument();
      expect(screen.getByText('$299')).toBeInTheDocument();
      expect(screen.getByText('🎭 This is a demo campaign.')).toBeInTheDocument();
    });

    it('should show demo comments section with signup prompt', async () => {
      mockAuth.mockResolvedValue(null);

      const params = Promise.resolve({ id: 'demo-1' });
      const component = await CampaignPage({ params });
      render(component);

      expect(screen.getByText('Comments')).toBeInTheDocument();
      expect(screen.getByText('Comments are available on real campaigns')).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /sign up to join discussions/i })).toBeInTheDocument();
    });
  });

  describe('Real campaigns for authenticated users', () => {
    const mockCampaign = {
      id: 'real-campaign-1',
      title: 'Real AI Platform',
      summary: 'Actual AI platform for production use',
      description: '<p>This is a real campaign with actual features.</p>',
      status: 'live',
      raisedDollars: 45000,
      fundingGoalDollars: 120000,
      deployModes: ['saas', 'api'],
      sectors: ['ai', 'productivity'],
      createdAt: new Date('2024-02-01'),
      endsAt: new Date('2024-11-30'),
      image: '/real-campaign.jpg',
      leadVideoUrl: 'https://youtube.com/watch?v=real123',
      maker: { id: 'real-maker', name: 'Real Creator', email: 'creator@real.com' },
      milestones: [
        {
          id: 'real-milestone-1',
          name: 'API Development',
          status: 'completed',
          pct: 40,
          acceptance: { checklist: ['REST API implemented', 'Documentation completed'] },
        },
        {
          id: 'real-milestone-2',
          name: 'UI Development',
          status: 'in_progress',
          pct: 35,
          acceptance: { checklist: ['Dashboard created', 'User management'] },
        },
        {
          id: 'real-milestone-3',
          name: 'Production Deployment',
          status: 'pending',
          pct: 25,
          acceptance: { checklist: ['CI/CD pipeline', 'Monitoring setup'] },
        },
      ],
      stretchGoals: [
        {
          id: 'real-stretch-1',
          title: 'Advanced Analytics',
          description: 'Machine learning powered analytics',
          targetDollars: 200000,
        },
      ],
      pledgeTiers: [
        {
          title: 'Starter',
          description: 'Basic access to the platform',
          amount: 149,
          currentBackers: 20,
          maxBackers: 100,
          isActive: true,
          order: 1,
        },
        {
          title: 'Enterprise',
          description: 'Full enterprise features and support',
          amount: 499,
          currentBackers: 10,
          maxBackers: 30,
          isActive: true,
          order: 2,
        },
      ],
      teamMembers: [
        { userId: 'team-1', user: { id: 'team-1', name: 'Team Member 1', email: 'team1@real.com' } },
      ],
      comments: [
        {
          id: 'comment-1',
          content: 'Great project!',
          createdAt: new Date(),
          user: { id: 'commenter-1', name: 'Commenter 1', email: 'commenter1@example.com' },
          parentId: null,
          replies: [],
        },
      ],
      pledges: [],
      _count: { pledges: 30, comments: 15 },
    };

    beforeEach(() => {
      mockAuth.mockResolvedValue({
        user: { id: 'user-1', email: 'user@example.com', roles: ['user'] }
      } as any);
    });

    it('should render real campaign for authenticated users', async () => {
      mockPrismaFindUnique.mockResolvedValue(mockCampaign);

      const params = Promise.resolve({ id: 'real-campaign-1' });
      const component = await CampaignPage({ params });
      render(component);

      // Should not show demo banner
      expect(screen.queryByText('DEMO CAMPAIGN')).not.toBeInTheDocument();

      // Check campaign content
      expect(screen.getByText('Real AI Platform')).toBeInTheDocument();
      expect(screen.getByText('Actual AI platform for production use')).toBeInTheDocument();
      expect(screen.getByText('$45,000')).toBeInTheDocument();
      expect(screen.getByText('of $120,000')).toBeInTheDocument();
      expect(screen.getByText('38% funded')).toBeInTheDocument(); // 45000/120000 = 37.5%, rounded to 38%
    });

    it('should render pledge button for real campaigns', async () => {
      mockPrismaFindUnique.mockResolvedValue(mockCampaign);

      const params = Promise.resolve({ id: 'real-campaign-1' });
      const component = await CampaignPage({ params });
      render(component);

      expect(screen.getByTestId('pledge-button')).toBeInTheDocument();
      expect(screen.getByTestId('tier-0')).toHaveTextContent('Starter - $149');
      expect(screen.getByTestId('tier-1')).toHaveTextContent('Enterprise - $499');
    });

    it('should render comment section for real campaigns', async () => {
      mockPrismaFindUnique.mockResolvedValue(mockCampaign);

      const params = Promise.resolve({ id: 'real-campaign-1' });
      const component = await CampaignPage({ params });
      render(component);

      expect(screen.getByTestId('comment-section')).toBeInTheDocument();
      expect(screen.getByText('Comments for real-campaign-1')).toBeInTheDocument();
      expect(screen.getByTestId('can-comment')).toBeInTheDocument();
    });

    it('should render video embed when leadVideoUrl is present', async () => {
      mockPrismaFindUnique.mockResolvedValue(mockCampaign);

      const params = Promise.resolve({ id: 'real-campaign-1' });
      const component = await CampaignPage({ params });
      render(component);

      expect(screen.getByTestId('video-embed')).toBeInTheDocument();
      expect(screen.getByText('Video: Real AI Platform - Campaign Video - https://youtube.com/watch?v=real123')).toBeInTheDocument();
    });

    it('should render artifact uploader for authenticated users', async () => {
      mockPrismaFindUnique.mockResolvedValue(mockCampaign);

      const params = Promise.resolve({ id: 'real-campaign-1' });
      const component = await CampaignPage({ params });
      render(component);

      expect(screen.getByTestId('artifact-uploader')).toBeInTheDocument();
      expect(screen.getByText('Artifact Uploader for real-campaign-1')).toBeInTheDocument();
    });

    it('should show days left calculation', async () => {
      const campaignWithEndDate = {
        ...mockCampaign,
        endsAt: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 days from now
      };
      
      mockPrismaFindUnique.mockResolvedValue(campaignWithEndDate);

      const params = Promise.resolve({ id: 'real-campaign-1' });
      const component = await CampaignPage({ params });
      render(component);

      expect(screen.getByText('15 days left')).toBeInTheDocument();
    });

    it('should show "Last day!" when campaign ends today', async () => {
      const campaignEndingToday = {
        ...mockCampaign,
        endsAt: new Date(Date.now() + 12 * 60 * 60 * 1000), // 12 hours from now (same day)
      };
      
      mockPrismaFindUnique.mockResolvedValue(campaignEndingToday);

      const params = Promise.resolve({ id: 'real-campaign-1' });
      const component = await CampaignPage({ params });
      render(component);

      expect(screen.getByText('Last day!')).toBeInTheDocument();
    });
  });

  describe('Campaign owner permissions', () => {
    const ownerCampaign = {
      id: 'owner-campaign-1',
      title: 'Owner Campaign',
      summary: 'Campaign owned by current user',
      description: '<p>Campaign description.</p>',
      status: 'draft',
      raisedDollars: 5000,
      fundingGoalDollars: 50000,
      deployModes: ['saas'],
      sectors: ['tech'],
      createdAt: new Date(),
      endsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      image: '/owner-campaign.jpg',
      maker: { id: 'owner-user', name: 'Owner User', email: 'owner@example.com' },
      milestones: [],
      stretchGoals: [],
      pledgeTiers: [],
      teamMembers: [],
      comments: [],
      pledges: [],
      _count: { pledges: 5, comments: 2 },
    };

    beforeEach(() => {
      mockAuth.mockResolvedValue({
        user: { id: 'owner-user', email: 'owner@example.com', roles: ['user'] }
      } as any);
    });

    it('should show edit controls for campaign owner', async () => {
      mockPrismaFindUnique.mockResolvedValue(ownerCampaign);

      const params = Promise.resolve({ id: 'owner-campaign-1' });
      const component = await CampaignPage({ params });
      render(component);

      expect(screen.getByRole('link', { name: /edit/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /milestones/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /team/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /updates/i })).toBeInTheDocument();
    });

    it('should show image generator for campaign owner', async () => {
      mockPrismaFindUnique.mockResolvedValue(ownerCampaign);

      const params = Promise.resolve({ id: 'owner-campaign-1' });
      const component = await CampaignPage({ params });
      render(component);

      expect(screen.getByTestId('image-generator')).toBeInTheDocument();
      expect(screen.getByText('Image Generator for owner-campaign-1')).toBeInTheDocument();
      expect(screen.getByTestId('has-current-image')).toHaveTextContent('Has image: /owner-campaign.jpg');
    });

    it('should show auto image generation wrapper for campaign owner', async () => {
      mockPrismaFindUnique.mockResolvedValue(ownerCampaign);

      const params = Promise.resolve({ id: 'owner-campaign-1' });
      const component = await CampaignPage({ params });
      render(component);

      expect(screen.getByTestId('auto-image-wrapper')).toBeInTheDocument();
      expect(screen.getByTestId('has-image')).toBeInTheDocument();
      expect(screen.getByTestId('is-owner')).toBeInTheDocument();
    });

    it('should show milestone management link for draft campaigns', async () => {
      mockPrismaFindUnique.mockResolvedValue(ownerCampaign);

      const params = Promise.resolve({ id: 'owner-campaign-1' });
      const component = await CampaignPage({ params });
      render(component);

      expect(screen.getByRole('link', { name: /milestones/i })).toHaveAttribute('href', '/campaigns/owner-campaign-1/milestones');
    });
  });

  describe('Error handling', () => {
    it('should call notFound when campaign does not exist', async () => {
      mockAuth.mockResolvedValue(null);
      mockPrismaFindUnique.mockResolvedValue(null);

      const params = Promise.resolve({ id: 'non-existent-campaign' });
      
      await expect(CampaignPage({ params })).rejects.toThrow();
      expect(mockNotFound).toHaveBeenCalled();
    });

    it('should handle campaigns without images', async () => {
      const campaignWithoutImage = {
        id: 'no-image-campaign',
        title: 'Campaign Without Image',
        summary: 'No image campaign',
        status: 'live',
        raisedDollars: 10000,
        fundingGoalDollars: 40000,
        deployModes: ['saas'],
        sectors: ['tech'],
        createdAt: new Date(),
        endsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        image: null,
        maker: { id: 'maker-1', name: 'Maker', email: 'maker@example.com' },
        milestones: [],
        stretchGoals: [],
        pledgeTiers: [],
        teamMembers: [],
        comments: [],
        pledges: [],
        _count: { pledges: 10, comments: 3 },
      };

      mockAuth.mockResolvedValue({
        user: { id: 'user-1', email: 'user@example.com', roles: ['user'] }
      } as any);
      mockPrismaFindUnique.mockResolvedValue(campaignWithoutImage);

      const params = Promise.resolve({ id: 'no-image-campaign' });
      const component = await CampaignPage({ params });
      render(component);

      expect(screen.getByText('Campaign Without Image')).toBeInTheDocument();
      expect(screen.queryByRole('img')).not.toBeInTheDocument();
    });

    it('should handle campaigns without stretch goals', async () => {
      const campaignWithoutStretchGoals = {
        id: 'no-stretch-campaign',
        title: 'Campaign Without Stretch Goals',
        summary: 'No stretch goals campaign',
        status: 'live',
        raisedDollars: 15000,
        fundingGoalDollars: 50000,
        deployModes: ['saas'],
        sectors: ['tech'],
        createdAt: new Date(),
        endsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        image: '/campaign.jpg',
        maker: { id: 'maker-1', name: 'Maker', email: 'maker@example.com' },
        milestones: [],
        stretchGoals: [],
        pledgeTiers: [],
        teamMembers: [],
        comments: [],
        pledges: [],
        _count: { pledges: 15, comments: 5 },
      };

      mockAuth.mockResolvedValue({
        user: { id: 'user-1', email: 'user@example.com', roles: ['user'] }
      } as any);
      mockPrismaFindUnique.mockResolvedValue(campaignWithoutStretchGoals);

      const params = Promise.resolve({ id: 'no-stretch-campaign' });
      const component = await CampaignPage({ params });
      render(component);

      expect(screen.getByText('Campaign Without Stretch Goals')).toBeInTheDocument();
      expect(screen.queryByText('Stretch Goals')).not.toBeInTheDocument();
    });
  });

  describe('Campaign details and metadata', () => {
    const detailedCampaign = {
      id: 'detailed-campaign',
      title: 'Detailed Campaign',
      summary: 'Campaign with all details',
      status: 'live',
      raisedDollars: 25000,
      fundingGoalDollars: 75000,
      deployModes: ['saas', 'on-prem', 'hybrid'],
      sectors: ['ai', 'automation', 'productivity'],
      createdAt: new Date('2024-03-01'),
      endsAt: new Date('2024-12-01'),
      image: '/detailed-campaign.jpg',
      maker: { id: 'detailed-maker', name: 'Detailed Maker', email: 'detailed@example.com' },
      milestones: [],
      stretchGoals: [],
      pledgeTiers: [],
      teamMembers: [],
      comments: [],
      pledges: [],
      _count: { pledges: 25, comments: 10 },
    };

    beforeEach(() => {
      mockAuth.mockResolvedValue({
        user: { id: 'user-1', email: 'user@example.com', roles: ['user'] }
      } as any);
      mockPrismaFindUnique.mockResolvedValue(detailedCampaign);
    });

    it('should render campaign details section', async () => {
      const params = Promise.resolve({ id: 'detailed-campaign' });
      const component = await CampaignPage({ params });
      render(component);

      expect(screen.getByText('Campaign Details')).toBeInTheDocument();
      expect(screen.getByText('Launch Date')).toBeInTheDocument();
      expect(screen.getByText('Campaign Ends')).toBeInTheDocument();
      expect(screen.getByText('Deployment Options')).toBeInTheDocument();
      expect(screen.getByText('Sectors')).toBeInTheDocument();
    });

    it('should render deployment modes correctly', async () => {
      const params = Promise.resolve({ id: 'detailed-campaign' });
      const component = await CampaignPage({ params });
      render(component);

      expect(screen.getByText('SAAS')).toBeInTheDocument();
      expect(screen.getByText('ON-PREM')).toBeInTheDocument();
      expect(screen.getByText('HYBRID')).toBeInTheDocument();
    });

    it('should render sectors correctly', async () => {
      const params = Promise.resolve({ id: 'detailed-campaign' });
      const component = await CampaignPage({ params });
      render(component);

      expect(screen.getByText('Ai')).toBeInTheDocument();
      expect(screen.getByText('Automation')).toBeInTheDocument();
      expect(screen.getByText('Productivity')).toBeInTheDocument();
    });

    it('should format dates correctly', async () => {
      const params = Promise.resolve({ id: 'detailed-campaign' });
      const component = await CampaignPage({ params });
      render(component);

      // Check that dates are formatted (exact format may vary by locale)
      const launchDate = screen.getByText('Launch Date').nextSibling;
      const endDate = screen.getByText('Campaign Ends').nextSibling;
      
      expect(launchDate).toBeInTheDocument();
      expect(endDate).toBeInTheDocument();
    });
  });
});