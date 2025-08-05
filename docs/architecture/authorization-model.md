# VibeFunder Authorization Model

## Overview
VibeFunder implements a comprehensive role-based access control (RBAC) system with resource-specific permissions. The authorization model ensures proper data security while enabling collaborative campaign management.

## User Roles

### Primary Roles
- **Admin**: Platform administrators with full system access
- **Maker**: Users who create campaigns
- **Backer**: Users who back campaigns
- **Service Provider**: Organizations offering services

### Campaign-Specific Roles
- **Campaign Owner**: The maker who created the campaign
- **Team Member**: Users added to campaign team with edit permissions
- **Backer**: Users who have pledged to the campaign

## Authorization Rules

### Campaign Operations

#### View Permissions
```typescript
// Public campaigns - anyone can view
if (campaign.status === 'published' && campaign.visibility === 'public') {
  return true;
}

// Private campaigns - restricted access
if (campaign.visibility === 'private') {
  return isAdmin || isOwner || isTeamMember || isBacker;
}

// Draft campaigns - only creators and team
if (campaign.status === 'draft') {
  return isAdmin || isOwner || isTeamMember;
}
```

#### Create Permissions
```typescript
// Anyone with maker role can create campaigns
const canCreate = session.roles?.includes('maker') || session.roles?.includes('admin');
```

#### Edit Permissions
```typescript
const canEdit = isAdmin || 
  (isOwner || isTeamMember) && 
  (campaign.status === 'draft' || isAdmin);

// Live campaigns can only be edited by admins for certain fields
const canEditLive = isAdmin || 
  (isOwner || isTeamMember) && allowedLiveEditFields.includes(field);
```

#### Delete Permissions
```typescript
const canDelete = isAdmin || 
  (isOwner && campaign.status === 'draft');

// Only admins can delete live/funded campaigns
const canDeleteLive = isAdmin;
```

### Campaign Sub-Resources (Milestones, Pledge Tiers, Stretch Goals)

#### View Permissions
```typescript
// Follow parent campaign view permissions
const canView = canViewCampaign(campaign, user);
```

#### Create/Edit/Delete Permissions
```typescript
const canModify = isAdmin || 
  (isOwner || isTeamMember) && 
  (campaign.status === 'draft' || isAdmin);

// Some modifications allowed on live campaigns
const canModifyLive = isAdmin || 
  (isOwner || isTeamMember) && allowedLiveModifications.includes(operation);
```

### Organization Operations

#### View Permissions
```typescript
// Public service providers
if (organization.type === 'service_provider' && organization.listingVisibility === 'public') {
  return true;
}

// Private organizations
return isAdmin || isOrgOwner || isOrgMember;
```

#### Edit Permissions
```typescript
const canEdit = isAdmin || isOrgOwner;

// Team members can edit certain fields
const canEditLimited = isAdmin || isOrgOwner || 
  (isOrgMember && limitedEditFields.includes(field));
```

### Service Provider Permissions

#### Service Listings
```typescript
// View based on service visibility settings
if (service.visibility === 'public') {
  return true;
}

if (service.visibility === 'authenticated') {
  return !!session;
}

if (service.visibility === 'private') {
  return isAdmin || isServiceProvider;
}
```

#### Service Management
```typescript
const canManageService = isAdmin || 
  (isOrgOwner && organization.type === 'service_provider');
```

### Comment System Permissions

#### View Comments
```typescript
// Follow parent resource permissions
const canViewComments = canViewResource(parentResource, user);
```

#### Create Comments
```typescript
// Authenticated users can comment on public resources
const canComment = session && canViewResource(parentResource, user);

// Campaign-specific rules
if (campaign.onlyBackersComment) {
  return isAdmin || isOwner || isTeamMember || isBacker;
}
```

#### Edit/Delete Comments
```typescript
const canModifyComment = isAdmin || 
  isCommentAuthor || 
  (isResourceOwner && moderationAllowed);
```

### Payment and Financial Operations

#### View Financial Data
```typescript
// Campaign financial overview
const canViewFinancials = isAdmin || isOwner || isTeamMember;

// Detailed transaction data
const canViewTransactions = isAdmin || 
  (isOwner && campaign.status !== 'draft');
```

#### Process Payments
```typescript
// Anyone can make pledges to public campaigns
const canPledge = session && campaign.status === 'published';

// Only platform and campaign owners can process payouts
const canProcessPayout = isAdmin || 
  (isOwner && campaign.status === 'funded');
```

## Implementation Patterns

### Middleware Authorization
```typescript
// In API routes
export async function POST(req: NextRequest) {
  const session = await auth();
  
  // Check basic authentication
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get resource and check ownership
  const resource = await getResource(resourceId);
  const permissions = await checkPermissions(resource, session.user);
  
  if (!permissions.canEdit) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  
  // Proceed with operation
}
```

### Component-Level Authorization
```typescript
// In React components
function EditButton({ campaign }: { campaign: Campaign }) {
  const { session } = useAuth();
  const permissions = useCampaignPermissions(campaign, session);
  
  if (!permissions.canEdit) {
    return null;
  }
  
  return <button onClick={handleEdit}>Edit Campaign</button>;
}
```

### Permission Helper Functions
```typescript
// Centralized permission logic
export function getCampaignPermissions(campaign: Campaign, user: User) {
  const isAdmin = user.roles?.includes('admin');
  const isOwner = campaign.makerId === user.id;
  const isTeamMember = campaign.teamMembers?.some(tm => tm.userId === user.id);
  const isBacker = campaign.pledges?.some(p => p.userId === user.id);
  
  return {
    canView: isAdmin || isOwner || isTeamMember || 
             (campaign.status === 'published' && campaign.visibility === 'public'),
    canEdit: isAdmin || (isOwner || isTeamMember) && 
             (campaign.status === 'draft' || isAdmin),
    canDelete: isAdmin || (isOwner && campaign.status === 'draft'),
    canManageTeam: isAdmin || isOwner,
    canViewFinancials: isAdmin || isOwner || isTeamMember,
    canProcessPayout: isAdmin || (isOwner && campaign.status === 'funded')
  };
}
```

## Security Considerations

### Defense in Depth
1. **Authentication**: Verify user identity
2. **Authorization**: Check resource permissions
3. **Input Validation**: Sanitize all inputs
4. **Output Encoding**: Prevent XSS attacks
5. **Audit Logging**: Track all sensitive operations

### Common Vulnerabilities Prevention

#### Broken Access Control (OWASP #1)
```typescript
// Always verify permissions server-side
const permissions = await checkPermissions(resource, user);
if (!permissions.canAccess) {
  throw new Error('Access denied');
}
```

#### Insecure Direct Object References
```typescript
// Use permission-based queries instead of direct IDs
const campaigns = await prisma.campaign.findMany({
  where: {
    OR: [
      { makerId: user.id },
      { teamMembers: { some: { userId: user.id } } },
      { status: 'published', visibility: 'public' }
    ]
  }
});
```

## Testing Authorization

### Unit Tests
```typescript
describe('Campaign Permissions', () => {
  it('should allow owner to edit draft campaign', () => {
    const permissions = getCampaignPermissions(draftCampaign, owner);
    expect(permissions.canEdit).toBe(true);
  });
  
  it('should prevent non-admin from deleting live campaign', () => {
    const permissions = getCampaignPermissions(liveCampaign, owner);
    expect(permissions.canDelete).toBe(false);
  });
});
```

### Integration Tests
```typescript
describe('API Authorization', () => {
  it('should return 403 for unauthorized edit attempt', async () => {
    const response = await fetch(`/api/campaigns/${campaignId}`, {
      method: 'PUT',
      headers: createAuthHeaders(unauthorizedUser.id),
      body: JSON.stringify(updateData)
    });
    
    expect(response.status).toBe(403);
  });
});
```

## Admin Override Capabilities

Admins have special permissions that override normal authorization rules:

### Campaign Management
- Edit any campaign regardless of status or ownership
- Delete campaigns in any status (including live/funded)
- Transfer campaign ownership
- Manage team members for any campaign
- Access financial data for any campaign

### Organization Management
- Edit any organization
- Approve/reject service provider applications
- Manage organization memberships
- Override visibility settings

### User Management
- View all user data
- Modify user roles and permissions
- Suspend or ban users
- Access audit logs

### System Operations
- Access admin dashboard
- Modify platform settings
- Perform bulk operations
- Generate reports

This authorization model ensures proper security while enabling collaborative features and maintaining administrative control.