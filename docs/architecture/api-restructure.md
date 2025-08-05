# VibeFunder API Restructuring

## Overview
Reorganized API endpoints to better reflect resource relationships and improve developer experience.

## New API Structure

### Campaign-Related Endpoints
All campaign sub-resources are now nested under the parent campaign:

```
/api/campaigns/[id]/
├── milestones/
│   ├── GET    - List campaign milestones
│   ├── POST   - Create milestone
│   └── [milestoneId]/
│       ├── GET    - Get specific milestone
│       ├── PUT    - Update milestone
│       └── DELETE - Delete milestone
├── pledge-tiers/
│   ├── GET    - List campaign pledge tiers
│   ├── POST   - Create pledge tier
│   └── [tierId]/
│       ├── GET    - Get specific pledge tier
│       ├── PUT    - Update pledge tier
│       └── DELETE - Delete pledge tier
└── stretch-goals/
    ├── GET    - List campaign stretch goals
    ├── POST   - Create stretch goal
    └── [goalId]/
        ├── GET    - Get specific stretch goal
        ├── PUT    - Update stretch goal
        └── DELETE - Delete stretch goal
```

### Payment-Related Endpoints
All payment functionality grouped under `/api/payments/`:

```
/api/payments/
├── checkout-session/
│   └── POST   - Create Stripe checkout session
└── stripe/
    └── webhook/
        └── POST   - Handle Stripe webhooks
```

### Other Endpoints (Unchanged)
```
/api/campaigns/           - Campaign CRUD
/api/organizations/       - Organization management
/api/services/           - Service provider listings
/api/auth/              - Authentication
/api/admin/             - Admin operations
/api/waitlist/          - Waitlist management
/api/artifacts/         - File uploads
```

## Migration Changes

### Before (Old Structure)
```typescript
// Old endpoints
POST /api/milestones
PUT  /api/milestones/[id]
POST /api/pledge-tiers  
PUT  /api/pledge-tiers/[id]
POST /api/stretch-goals
PUT  /api/stretch-goals/[id]
POST /api/checkout-session
POST /api/stripe/webhook
```

### After (New Structure)
```typescript
// New nested endpoints
POST /api/campaigns/[id]/milestones
PUT  /api/campaigns/[id]/milestones/[milestoneId]
POST /api/campaigns/[id]/pledge-tiers
PUT  /api/campaigns/[id]/pledge-tiers/[tierId]  
POST /api/campaigns/[id]/stretch-goals
PUT  /api/campaigns/[id]/stretch-goals/[goalId]
POST /api/payments/checkout-session
POST /api/payments/stripe/webhook
```

## Enhanced Authorization

### Resource-Level Permissions
Each endpoint now implements comprehensive authorization:

```typescript
// Permission check pattern
const { resource, canEdit, isAdmin } = await checkResourcePermissions(
  resourceId, 
  userId
);

// Authorization levels:
// - Admin: Full access to everything
// - Owner: Full access to owned resources
// - Team Member: Edit access to team resources  
// - Org Owner: Access via organization ownership
// - Public: View access to published resources
```

### Campaign Status Restrictions
- **Draft Campaigns**: Full CRUD by owners/team/admin
- **Live Campaigns**: Limited edits, admin override
- **Completed Campaigns**: View only, admin override

### Example Authorization Logic
```typescript
// Milestone creation
if (campaign.status !== 'draft' && !isAdmin) {
  return NextResponse.json({ 
    error: 'Cannot add milestones to live campaigns' 
  }, { status: 403 });
}

// Pledge tier deletion  
if (pledgeCount > 0 && !isAdmin) {
  return NextResponse.json({ 
    error: 'Cannot delete tier with existing pledges' 
  }, { status: 403 });
}
```

## Benefits

### 1. Logical Resource Grouping
- Campaign sub-resources clearly nested
- Payment operations centralized
- Easier to understand API structure

### 2. Improved Security
- Campaign ID validation built into URL structure
- Consistent permission checking across related resources
- Admin override capabilities clearly implemented

### 3. Better Developer Experience
- RESTful URL patterns
- Predictable endpoint structure
- Clear resource ownership

### 4. Enhanced Testing
- Test files organized by resource hierarchy
- Consistent test patterns across related endpoints
- Better isolation of functionality

## Implementation Status

### ✅ Completed
- [x] Created new nested endpoint structure
- [x] Implemented comprehensive authorization logic
- [x] Enhanced error handling and validation
- [x] Updated payment endpoints grouping

### 🔄 In Progress
- [ ] Update all test files to use new endpoints
- [ ] Remove old standalone endpoints
- [ ] Update frontend API calls

### 📋 Pending
- [ ] Update API documentation
- [ ] Create migration guide for existing integrations
- [ ] Performance testing of nested routes

## Breaking Changes

### For API Consumers
1. **Milestone APIs**: Must include campaign ID in URL path
2. **Pledge Tier APIs**: Must include campaign ID in URL path  
3. **Stretch Goal APIs**: Must include campaign ID in URL path
4. **Payment APIs**: Moved to `/api/payments/` prefix

### Migration Required
- Update all API calls to use new nested structure
- Ensure campaign ID is available in calling context
- Update error handling for new authorization responses

This restructuring provides a more intuitive, secure, and maintainable API architecture that better reflects the application's resource relationships.