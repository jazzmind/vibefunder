import { prisma } from '@/lib/db';

export interface ServiceProviderMetrics {
  totalBids: number;
  wonBids: number;
  totalEarnings: number; // In cents
  conversionRate: string; // Percentage
  activeProjects: number;
  completedProjects: number;
}

export async function getServiceProviderMetrics(organizationId: string): Promise<ServiceProviderMetrics> {
  // Get all bids for this organization
  const allBids = await prisma.bid.findMany({
    where: { organizationId },
    include: {
      rfp: {
        include: {
          selectedBid: true,
          project: true
        }
      }
    }
  });

  // Get projects for this organization
  const projects = await prisma.project.findMany({
    where: { organizationId }
  });

  // Calculate metrics
  const totalBids = allBids.length;
  const wonBids = allBids.filter(bid => bid.rfp.selectedBidId === bid.id).length;
  const conversionRate = totalBids > 0 ? ((wonBids / totalBids) * 100).toFixed(1) : '0.0';
  
  // Calculate earnings from completed projects
  const completedProjects = projects.filter(p => p.status === 'completed');
  const totalEarnings = completedProjects.reduce((sum, project) => sum + project.providerEarnings, 0);
  
  const activeProjects = projects.filter(p => p.status === 'active').length;

  return {
    totalBids,
    wonBids,
    totalEarnings,
    conversionRate,
    activeProjects,
    completedProjects: completedProjects.length
  };
}

export function calculatePlatformFee(proposedPrice: number, feeIncluded: boolean): {
  proposedPrice: number;
  platformFee: number;
  providerEarnings: number;
  clientPays: number;
} {
  const PLATFORM_FEE_PERCENTAGE = 0.20; // 20%

  if (feeIncluded) {
    // Fee is included in the proposed price
    const platformFee = Math.round(proposedPrice * PLATFORM_FEE_PERCENTAGE);
    const providerEarnings = proposedPrice - platformFee;
    
    return {
      proposedPrice,
      platformFee,
      providerEarnings,
      clientPays: proposedPrice
    };
  } else {
    // Fee is added on top of the proposed price
    const platformFee = Math.round(proposedPrice * PLATFORM_FEE_PERCENTAGE);
    const clientPays = proposedPrice + platformFee;
    
    return {
      proposedPrice,
      platformFee,
      providerEarnings: proposedPrice,
      clientPays
    };
  }
}

export function formatCurrency(amountInCents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amountInCents / 100);
}
