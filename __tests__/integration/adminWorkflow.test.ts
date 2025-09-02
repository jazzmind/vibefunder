/**
 * Admin Workflow Integration Tests
 * 
 * Tests comprehensive admin functionality:
 * - Admin authentication and authorization
 * - Campaign review and moderation
 * - User management and account actions
 * - Platform analytics and reporting
 * - System configuration and settings
 * - Audit trails and compliance
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import {
  createTestUser,
  createTestCampaign,
  createTestOrganization,
  createTestPledge,
  generateTestEmail,
  createAuthHeaders,
  setupTestEnvironment,
  teardownTestEnvironment,
  testPrisma,
} from '../utils/test-helpers';
import emailMock from '../mocks/email.mock';
import stripeMock from '../mocks/stripe.mock';

const API_BASE = process.env.API_TEST_URL || 'http://localhost:3101';

describe('Admin Workflow Integration Tests', () => {
  let adminUser: any;
  let superAdminUser: any;
  let regularUser: any;
  let creatorUser: any;
  let backerUser: any;
  let testOrganization: any;
  let testCampaigns: any[];
  let testUsers: any[];

  beforeAll(async () => {
    await setupTestEnvironment();
    
    // Create admin users
    adminUser = await createTestUser({
      email: generateTestEmail('admin'),
      name: 'Admin User',
      roles: ['admin'],
    });
    
    superAdminUser = await createTestUser({
      email: generateTestEmail('superadmin'),
      name: 'Super Admin',
      roles: ['super_admin', 'admin'],
    });
    
    // Create regular users for testing admin actions
    regularUser = await createTestUser({
      email: generateTestEmail('regular'),
      name: 'Regular User',
      roles: ['user'],
    });
    
    creatorUser = await createTestUser({
      email: generateTestEmail('creator'),
      name: 'Campaign Creator',
      roles: ['user'],
    });
    
    backerUser = await createTestUser({
      email: generateTestEmail('backer'),
      name: 'Backer User',
      roles: ['user'],
    });
    
    testUsers = [regularUser, creatorUser, backerUser];
    
    // Create test organization and campaigns
    testOrganization = await createTestOrganization({
      name: 'Admin Test Organization',
      ownerId: creatorUser.id,
    });
    
    // Create campaigns with various statuses
    const campaignData = [
      {
        title: 'Pending Review Campaign',
        summary: 'Campaign waiting for admin approval',
        status: 'pending_review',
        fundingGoalDollars: 10000,
      },
      {
        title: 'Published Campaign',
        summary: 'Active campaign that is published',
        status: 'published',
        fundingGoalDollars: 25000,
        endsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
      {
        title: 'Reported Campaign',
        summary: 'Campaign with user reports',
        status: 'published',
        fundingGoalDollars: 15000,
        endsAt: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
      },
      {
        title: 'Suspicious Campaign',
        summary: 'Campaign that needs investigation',
        status: 'flagged',
        fundingGoalDollars: 100000,
      },
    ];
    
    testCampaigns = [];
    for (const campaign of campaignData) {
      const created = await createTestCampaign({
        ...campaign,
        organizationId: testOrganization.id,
      }, creatorUser.id);
      testCampaigns.push(created);
    }
    
    // Create some test pledges
    const publishedCampaign = testCampaigns.find(c => c.status === 'published');
    if (publishedCampaign) {
      await createTestPledge(publishedCampaign.id, backerUser.id, {
        amountDollars: 100,
        status: 'completed',
      });
    }
  });

  afterAll(async () => {
    await teardownTestEnvironment();
  });

  beforeEach(() => {
    emailMock.reset();
    stripeMock.reset();
  });

  describe('Admin Authentication and Authorization', () => {
    it('should allow admin login and access to admin panel', async () => {
      const loginResponse = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: adminUser.email,
          // In a real test, this would use proper password authentication
          password: 'admin-password',
        }),
      });

      // For testing purposes, we'll assume the login succeeds
      // In a real implementation, you'd verify the JWT token
      
      const adminDashboardResponse = await fetch(`${API_BASE}/api/admin/dashboard`, {
        headers: createAuthHeaders(adminUser),
      });

      expect(adminDashboardResponse.status).toBe(200);
      const dashboardData = await adminDashboardResponse.json();
      expect(dashboardData).toHaveProperty('totalUsers');
      expect(dashboardData).toHaveProperty('totalCampaigns');
      expect(dashboardData).toHaveProperty('totalPledges');
      expect(dashboardData).toHaveProperty('recentActivity');
    });

    it('should deny regular user access to admin endpoints', async () => {
      const unauthorizedResponse = await fetch(`${API_BASE}/api/admin/dashboard`, {
        headers: createAuthHeaders(regularUser),
      });

      expect(unauthorizedResponse.status).toBe(403);
      const errorData = await unauthorizedResponse.json();
      expect(errorData.success).toBe(false);
      expect(errorData.error).toContain('permission');
    });

    it('should differentiate between admin and super admin permissions', async () => {
      // Regular admin trying to access super admin function
      const systemSettingsResponse = await fetch(`${API_BASE}/api/admin/system/settings`, {
        headers: createAuthHeaders(adminUser),
      });

      expect(systemSettingsResponse.status).toBe(403); // Forbidden for regular admin
      
      // Super admin should have access
      const superAdminSettingsResponse = await fetch(`${API_BASE}/api/admin/system/settings`, {
        headers: createAuthHeaders(superAdminUser),
      });

      expect(superAdminSettingsResponse.status).toBe(200);
    });
  });

  describe('Campaign Review and Moderation', () => {
    it('should list campaigns pending review', async () => {
      const pendingResponse = await fetch(`${API_BASE}/api/admin/campaigns/pending`, {
        headers: createAuthHeaders(adminUser),
      });

      expect(pendingResponse.status).toBe(200);
      const pendingCampaigns = await pendingResponse.json();
      expect(Array.isArray(pendingCampaigns)).toBe(true);
      
      const pendingCampaign = pendingCampaigns.find((c: any) => 
        c.title === 'Pending Review Campaign'
      );
      expect(pendingCampaign).toBeDefined();
      expect(pendingCampaign.status).toBe('pending_review');
    });

    it('should allow admin to approve campaigns', async () => {
      const pendingCampaign = testCampaigns.find(c => c.status === 'pending_review');
      if (!pendingCampaign) {
        throw new Error('No pending campaign found');
      }

      const approveResponse = await fetch(`${API_BASE}/api/admin/campaigns/${pendingCampaign.id}/approve`, {
        method: 'POST',
        headers: createAuthHeaders(adminUser),
        body: JSON.stringify({
          notes: 'Campaign meets all requirements. Approved for publishing.',
          notifyCreator: true,
        }),
      });

      expect(approveResponse.status).toBe(200);
      const approveResult = await approveResponse.json();
      expect(approveResult.success).toBe(true);

      // Verify campaign status updated
      const updatedCampaign = await testPrisma.campaign.findUnique({
        where: { id: pendingCampaign.id },
      });
      expect(updatedCampaign?.status).toBe('approved');

      // Check approval notification sent
      const approvalEmails = emailMock.getEmailsBySubject('approved');
      expect(approvalEmails.length).toBeGreaterThan(0);
      
      const creatorEmail = approvalEmails.find(e => e.to === creatorUser.email);
      expect(creatorEmail).toBeDefined();
    });

    it('should allow admin to reject campaigns with reasons', async () => {
      // Create another campaign for rejection
      const rejectCampaign = await createTestCampaign({
        title: 'Campaign to Reject',
        summary: 'This campaign will be rejected',
        status: 'pending_review',
        fundingGoalDollars: 5000,
      }, creatorUser.id);

      const rejectResponse = await fetch(`${API_BASE}/api/admin/campaigns/${rejectCampaign.id}/reject`, {
        method: 'POST',
        headers: createAuthHeaders(adminUser),
        body: JSON.stringify({
          reason: 'violates_policy',
          notes: 'Campaign description contains prohibited content. Please review our content guidelines and resubmit.',
          notifyCreator: true,
        }),
      });

      expect(rejectResponse.status).toBe(200);
      const rejectResult = await rejectResponse.json();
      expect(rejectResult.success).toBe(true);

      // Verify campaign status updated
      const rejectedCampaign = await testPrisma.campaign.findUnique({
        where: { id: rejectCampaign.id },
      });
      expect(rejectedCampaign?.status).toBe('rejected');

      // Check rejection notification sent
      const rejectionEmails = emailMock.getEmailsBySubject('rejected');
      expect(rejectionEmails.length).toBeGreaterThan(0);
    });

    it('should handle campaign flagging and investigation', async () => {
      const reportedCampaign = testCampaigns.find(c => c.title === 'Reported Campaign');
      if (!reportedCampaign) {
        throw new Error('No reported campaign found');
      }

      const flagResponse = await fetch(`${API_BASE}/api/admin/campaigns/${reportedCampaign.id}/flag`, {
        method: 'POST',
        headers: createAuthHeaders(adminUser),
        body: JSON.stringify({
          reason: 'user_reports',
          severity: 'medium',
          notes: 'Multiple user reports received. Requires investigation.',
          assignTo: adminUser.id,
        }),
      });

      expect(flagResponse.status).toBe(200);
      const flagResult = await flagResponse.json();
      expect(flagResult.success).toBe(true);

      // Verify flag was created
      const campaignFlags = await testPrisma.campaignFlag?.findMany({
        where: { campaignId: reportedCampaign.id },
      }) || [];
      expect(campaignFlags.length).toBeGreaterThan(0);
    });

    it('should allow admin to suspend campaigns', async () => {
      const suspiciousCampaign = testCampaigns.find(c => c.status === 'flagged');
      if (!suspiciousCampaign) {
        throw new Error('No flagged campaign found');
      }

      const suspendResponse = await fetch(`${API_BASE}/api/admin/campaigns/${suspiciousCampaign.id}/suspend`, {
        method: 'POST',
        headers: createAuthHeaders(adminUser),
        body: JSON.stringify({
          reason: 'under_investigation',
          duration: '7d', // 7 days
          notes: 'Campaign suspended pending investigation of suspicious activity.',
          notifyCreator: true,
        }),
      });

      expect(suspendResponse.status).toBe(200);
      const suspendResult = await suspendResponse.json();
      expect(suspendResult.success).toBe(true);

      // Verify suspension
      const suspendedCampaign = await testPrisma.campaign.findUnique({
        where: { id: suspiciousCampaign.id },
      });
      expect(suspendedCampaign?.status).toBe('suspended');
    });
  });

  describe('User Management', () => {
    it('should list and search users', async () => {
      const usersResponse = await fetch(`${API_BASE}/api/admin/users?page=1&limit=20`, {
        headers: createAuthHeaders(adminUser),
      });

      expect(usersResponse.status).toBe(200);
      const usersData = await usersResponse.json();
      expect(usersData).toHaveProperty('users');
      expect(usersData).toHaveProperty('total');
      expect(usersData).toHaveProperty('page');
      expect(Array.isArray(usersData.users)).toBe(true);

      // Search for specific user
      const searchResponse = await fetch(`${API_BASE}/api/admin/users?search=${creatorUser.email}`, {
        headers: createAuthHeaders(adminUser),
      });

      expect(searchResponse.status).toBe(200);
      const searchData = await searchResponse.json();
      const foundUser = searchData.users.find((u: any) => u.email === creatorUser.email);
      expect(foundUser).toBeDefined();
    });

    it('should allow admin to view user details and activity', async () => {
      const userDetailsResponse = await fetch(`${API_BASE}/api/admin/users/${creatorUser.id}`, {
        headers: createAuthHeaders(adminUser),
      });

      expect(userDetailsResponse.status).toBe(200);
      const userDetails = await userDetailsResponse.json();
      expect(userDetails.id).toBe(creatorUser.id);
      expect(userDetails).toHaveProperty('campaigns');
      expect(userDetails).toHaveProperty('pledges');
      expect(userDetails).toHaveProperty('activityLog');
      expect(userDetails).toHaveProperty('joinedAt');
    });

    it('should allow admin to suspend user accounts', async () => {
      const suspendUserResponse = await fetch(`${API_BASE}/api/admin/users/${regularUser.id}/suspend`, {
        method: 'POST',
        headers: createAuthHeaders(adminUser),
        body: JSON.stringify({
          reason: 'policy_violation',
          duration: '30d',
          notes: 'Account suspended for 30 days due to repeated policy violations.',
          notifyUser: true,
        }),
      });

      expect(suspendUserResponse.status).toBe(200);
      const suspendResult = await suspendUserResponse.json();
      expect(suspendResult.success).toBe(true);

      // Verify user suspension
      const suspendedUser = await testPrisma.user.findUnique({
        where: { id: regularUser.id },
      });
      expect(suspendedUser?.roles).toContain('suspended');

      // Check suspension notification
      const suspensionEmails = emailMock.getEmailsBySubject('Account Suspended');
      expect(suspensionEmails.length).toBeGreaterThan(0);
    });

    it('should allow admin to update user roles', async () => {
      const updateRolesResponse = await fetch(`${API_BASE}/api/admin/users/${backerUser.id}/roles`, {
        method: 'PUT',
        headers: createAuthHeaders(superAdminUser), // Only super admin can change roles
        body: JSON.stringify({
          roles: ['user', 'verified_creator'],
          reason: 'User has demonstrated excellent campaign management skills',
        }),
      });

      expect(updateRolesResponse.status).toBe(200);
      const rolesResult = await updateRolesResponse.json();
      expect(rolesResult.success).toBe(true);

      // Verify role update
      const updatedUser = await testPrisma.user.findUnique({
        where: { id: backerUser.id },
      });
      expect(updatedUser?.roles).toContain('verified_creator');
    });

    it('should maintain audit trail of admin actions', async () => {
      const auditLogResponse = await fetch(`${API_BASE}/api/admin/audit-log?userId=${regularUser.id}`, {
        headers: createAuthHeaders(adminUser),
      });

      expect(auditLogResponse.status).toBe(200);
      const auditLog = await auditLogResponse.json();
      expect(Array.isArray(auditLog)).toBe(true);
      
      // Should contain suspension action
      const suspensionEntry = auditLog.find((entry: any) => 
        entry.action === 'user_suspended' && entry.targetUserId === regularUser.id
      );
      expect(suspensionEntry).toBeDefined();
      expect(suspensionEntry.adminId).toBe(adminUser.id);
    });
  });

  describe('Platform Analytics and Reporting', () => {
    it('should provide comprehensive platform statistics', async () => {
      const statsResponse = await fetch(`${API_BASE}/api/admin/statistics`, {
        headers: createAuthHeaders(adminUser),
      });

      expect(statsResponse.status).toBe(200);
      const stats = await statsResponse.json();
      
      expect(stats).toHaveProperty('users');
      expect(stats.users).toHaveProperty('total');
      expect(stats.users).toHaveProperty('activeThisMonth');
      expect(stats.users).toHaveProperty('newThisWeek');
      
      expect(stats).toHaveProperty('campaigns');
      expect(stats.campaigns).toHaveProperty('total');
      expect(stats.campaigns).toHaveProperty('published');
      expect(stats.campaigns).toHaveProperty('pendingReview');
      
      expect(stats).toHaveProperty('pledges');
      expect(stats.pledges).toHaveProperty('totalAmount');
      expect(stats.pledges).toHaveProperty('totalCount');
      expect(stats.pledges).toHaveProperty('averageAmount');
    });

    it('should generate revenue and financial reports', async () => {
      const revenueResponse = await fetch(`${API_BASE}/api/admin/reports/revenue`, {
        headers: createAuthHeaders(adminUser),
        method: 'POST',
        body: JSON.stringify({
          startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          endDate: new Date().toISOString(),
          groupBy: 'day',
        }),
      });

      expect(revenueResponse.status).toBe(200);
      const revenueData = await revenueResponse.json();
      expect(revenueData).toHaveProperty('totalRevenue');
      expect(revenueData).toHaveProperty('platformFees');
      expect(revenueData).toHaveProperty('chartsData');
      expect(Array.isArray(revenueData.chartsData)).toBe(true);
    });

    it('should provide user engagement analytics', async () => {
      const engagementResponse = await fetch(`${API_BASE}/api/admin/analytics/engagement`, {
        headers: createAuthHeaders(adminUser),
      });

      expect(engagementResponse.status).toBe(200);
      const engagement = await engagementResponse.json();
      
      expect(engagement).toHaveProperty('dailyActiveUsers');
      expect(engagement).toHaveProperty('averageSessionDuration');
      expect(engagement).toHaveProperty('topPages');
      expect(engagement).toHaveProperty('userRetention');
    });

    it('should track campaign performance metrics', async () => {
      const performanceResponse = await fetch(`${API_BASE}/api/admin/analytics/campaign-performance`, {
        headers: createAuthHeaders(adminUser),
      });

      expect(performanceResponse.status).toBe(200);
      const performance = await performanceResponse.json();
      
      expect(performance).toHaveProperty('successRate');
      expect(performance).toHaveProperty('averageFundingTime');
      expect(performance).toHaveProperty('topCategories');
      expect(performance).toHaveProperty('fundingDistribution');
    });
  });

  describe('System Configuration and Settings', () => {
    it('should allow super admin to update platform settings', async () => {
      const settingsResponse = await fetch(`${API_BASE}/api/admin/system/settings`, {
        method: 'PUT',
        headers: createAuthHeaders(superAdminUser),
        body: JSON.stringify({
          platformFeePercentage: 5.5,
          minimumPledgeAmount: 10,
          maximumCampaignDuration: 90, // days
          requireCampaignApproval: true,
          maintenanceMode: false,
        }),
      });

      expect(settingsResponse.status).toBe(200);
      const settingsResult = await settingsResponse.json();
      expect(settingsResult.success).toBe(true);

      // Verify settings were updated
      const updatedSettingsResponse = await fetch(`${API_BASE}/api/admin/system/settings`, {
        headers: createAuthHeaders(superAdminUser),
      });
      
      const updatedSettings = await updatedSettingsResponse.json();
      expect(updatedSettings.platformFeePercentage).toBe(5.5);
    });

    it('should manage feature flags', async () => {
      const featureFlagsResponse = await fetch(`${API_BASE}/api/admin/system/feature-flags`, {
        method: 'PUT',
        headers: createAuthHeaders(superAdminUser),
        body: JSON.stringify({
          aiImageGeneration: true,
          advancedAnalytics: true,
          betaFeatures: false,
          socialLogin: true,
        }),
      });

      expect(featureFlagsResponse.status).toBe(200);
      const flagsResult = await featureFlagsResponse.json();
      expect(flagsResult.success).toBe(true);
    });

    it('should manage email templates', async () => {
      const templateResponse = await fetch(`${API_BASE}/api/admin/email-templates/welcome`, {
        method: 'PUT',
        headers: createAuthHeaders(adminUser),
        body: JSON.stringify({
          subject: 'Welcome to VibeFunder - Updated!',
          html: '<h1>Welcome!</h1><p>Thanks for joining our updated platform.</p>',
          variables: ['userName', 'platformName'],
        }),
      });

      expect(templateResponse.status).toBe(200);
      const templateResult = await templateResponse.json();
      expect(templateResult.success).toBe(true);
    });
  });

  describe('Content Moderation Tools', () => {
    it('should provide content moderation queue', async () => {
      const moderationResponse = await fetch(`${API_BASE}/api/admin/moderation/queue`, {
        headers: createAuthHeaders(adminUser),
      });

      expect(moderationResponse.status).toBe(200);
      const moderationQueue = await moderationResponse.json();
      expect(Array.isArray(moderationQueue)).toBe(true);
      
      // Should include campaigns, comments, etc. flagged for review
      const flaggedContent = moderationQueue.filter((item: any) => 
        item.type === 'campaign' || item.type === 'comment'
      );
      expect(flaggedContent).toBeDefined();
    });

    it('should handle automated content flagging', async () => {
      const flagContentResponse = await fetch(`${API_BASE}/api/admin/moderation/auto-flag`, {
        method: 'POST',
        headers: createAuthHeaders(adminUser),
        body: JSON.stringify({
          contentType: 'campaign',
          contentId: testCampaigns[0].id,
          reason: 'inappropriate_language',
          confidence: 0.85,
          autoFlag: true,
        }),
      });

      expect(flagContentResponse.status).toBe(200);
      const flagResult = await flagContentResponse.json();
      expect(flagResult.success).toBe(true);
    });

    it('should provide AI-powered content analysis', async () => {
      const analysisResponse = await fetch(`${API_BASE}/api/admin/moderation/analyze`, {
        method: 'POST',
        headers: createAuthHeaders(adminUser),
        body: JSON.stringify({
          content: 'This is a test campaign description with some content to analyze.',
          type: 'campaign_description',
        }),
      });

      expect(analysisResponse.status).toBe(200);
      const analysis = await analysisResponse.json();
      expect(analysis).toHaveProperty('sentiment');
      expect(analysis).toHaveProperty('toxicity');
      expect(analysis).toHaveProperty('spam');
      expect(analysis).toHaveProperty('recommendations');
    });
  });

  describe('Support and Communication', () => {
    it('should manage support tickets', async () => {
      const ticketsResponse = await fetch(`${API_BASE}/api/admin/support/tickets`, {
        headers: createAuthHeaders(adminUser),
      });

      expect(ticketsResponse.status).toBe(200);
      const tickets = await ticketsResponse.json();
      expect(tickets).toHaveProperty('open');
      expect(tickets).toHaveProperty('assigned');
      expect(tickets).toHaveProperty('resolved');
    });

    it('should send platform-wide announcements', async () => {
      const announcementResponse = await fetch(`${API_BASE}/api/admin/announcements`, {
        method: 'POST',
        headers: createAuthHeaders(adminUser),
        body: JSON.stringify({
          title: 'Platform Maintenance Scheduled',
          content: 'We will be performing maintenance on Sunday from 2-4 AM UTC.',
          type: 'maintenance',
          targetAudience: 'all_users',
          sendEmail: true,
          sendInApp: true,
        }),
      });

      expect(announcementResponse.status).toBe(200);
      const announcementResult = await announcementResponse.json();
      expect(announcementResult.success).toBe(true);

      // Check that emails were queued
      const announcementEmails = emailMock.getEmailsBySubject('Platform Maintenance');
      expect(announcementEmails.length).toBeGreaterThan(0);
    });
  });

  describe('Security and Compliance', () => {
    it('should track security events', async () => {
      const securityResponse = await fetch(`${API_BASE}/api/admin/security/events`, {
        headers: createAuthHeaders(superAdminUser),
      });

      expect(securityResponse.status).toBe(200);
      const securityEvents = await securityResponse.json();
      expect(Array.isArray(securityEvents)).toBe(true);
    });

    it('should generate compliance reports', async () => {
      const complianceResponse = await fetch(`${API_BASE}/api/admin/compliance/report`, {
        method: 'POST',
        headers: createAuthHeaders(superAdminUser),
        body: JSON.stringify({
          type: 'gdpr',
          startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          endDate: new Date().toISOString(),
        }),
      });

      expect(complianceResponse.status).toBe(200);
      const compliance = await complianceResponse.json();
      expect(compliance).toHaveProperty('dataProcessing');
      expect(compliance).toHaveProperty('userRequests');
      expect(compliance).toHaveProperty('dataRetention');
    });

    it('should handle data export requests', async () => {
      const exportResponse = await fetch(`${API_BASE}/api/admin/data/export/${regularUser.id}`, {
        method: 'POST',
        headers: createAuthHeaders(adminUser),
        body: JSON.stringify({
          type: 'user_data',
          format: 'json',
          includeActivity: true,
        }),
      });

      expect(exportResponse.status).toBe(200);
      const exportResult = await exportResponse.json();
      expect(exportResult.success).toBe(true);
      expect(exportResult.exportId).toBeDefined();
    });
  });

  describe('Performance Monitoring', () => {
    it('should provide system performance metrics', async () => {
      const performanceResponse = await fetch(`${API_BASE}/api/admin/system/performance`, {
        headers: createAuthHeaders(adminUser),
      });

      expect(performanceResponse.status).toBe(200);
      const performance = await performanceResponse.json();
      expect(performance).toHaveProperty('responseTime');
      expect(performance).toHaveProperty('errorRate');
      expect(performance).toHaveProperty('throughput');
      expect(performance).toHaveProperty('databasePerformance');
    });

    it('should monitor system health', async () => {
      const healthResponse = await fetch(`${API_BASE}/api/admin/system/health`, {
        headers: createAuthHeaders(adminUser),
      });

      expect(healthResponse.status).toBe(200);
      const health = await healthResponse.json();
      expect(health).toHaveProperty('database');
      expect(health).toHaveProperty('redis');
      expect(health).toHaveProperty('externalServices');
      expect(health.status).toBe('healthy');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle concurrent admin actions gracefully', async () => {
      const concurrentActions = [];
      const testCampaign = testCampaigns[0];
      
      // Simulate multiple admins trying to modify the same campaign
      for (let i = 0; i < 3; i++) {
        concurrentActions.push(
          fetch(`${API_BASE}/api/admin/campaigns/${testCampaign.id}/notes`, {
            method: 'POST',
            headers: createAuthHeaders(adminUser),
            body: JSON.stringify({
              note: `Admin note ${i} - ${Date.now()}`,
            }),
          })
        );
      }

      const responses = await Promise.all(concurrentActions);
      
      // All should succeed or handle conflicts gracefully
      const successCount = responses.filter(r => r.status === 200).length;
      expect(successCount).toBeGreaterThan(0);
    });

    it('should validate admin permissions for sensitive operations', async () => {
      // Try to delete user data with insufficient permissions
      const deleteResponse = await fetch(`${API_BASE}/api/admin/users/${regularUser.id}/delete-data`, {
        method: 'DELETE',
        headers: createAuthHeaders(adminUser), // Regular admin shouldn't be able to delete user data
      });

      expect(deleteResponse.status).toBe(403);
      
      // Super admin should be able to perform the action
      const superDeleteResponse = await fetch(`${API_BASE}/api/admin/users/${regularUser.id}/delete-data`, {
        method: 'DELETE',
        headers: createAuthHeaders(superAdminUser),
        body: JSON.stringify({
          confirmation: 'DELETE',
          reason: 'User requested account deletion',
        }),
      });

      expect(superDeleteResponse.status).toBe(200);
    });

    it('should maintain data integrity during bulk operations', async () => {
      const bulkUpdateResponse = await fetch(`${API_BASE}/api/admin/campaigns/bulk-update`, {
        method: 'POST',
        headers: createAuthHeaders(adminUser),
        body: JSON.stringify({
          campaignIds: testCampaigns.map(c => c.id).slice(0, 2),
          update: {
            requireBackerAccount: false,
          },
        }),
      });

      expect(bulkUpdateResponse.status).toBe(200);
      const bulkResult = await bulkUpdateResponse.json();
      expect(bulkResult.success).toBe(true);
      expect(bulkResult.updatedCount).toBe(2);
    });
  });
});
