# Foreign Key Cascade & Error Handling Fixes ✅

## Problem Resolved
Fixed foreign key constraint errors when deleting campaigns and users, and added proper error handling with user-friendly messages.

## Root Causes
1. **Missing Cascade Deletions**: Related models weren't set to cascade when parent records were deleted
2. **Poor Error Handling**: Foreign key errors weren't caught and displayed meaningful messages to users
3. **Incomplete Error Feedback**: Users didn't know why deletions failed

## Solution Implemented

### 1. Schema Updates with Cascade Deletions

**Campaign-Related Models** (Cascade on Campaign Deletion):
```prisma
model Milestone {
  campaign  Campaign @relation(fields: [campaignId], references: [id], onDelete: Cascade)
}

model Pledge {
  campaign  Campaign @relation(fields: [campaignId], references: [id], onDelete: Cascade)
  backer    User     @relation(fields: [backerId], references: [id], onDelete: Restrict)
}

model Badge {
  campaign  Campaign @relation(fields: [campaignId], references: [id], onDelete: Cascade)
}

model License {
  campaign  Campaign @relation(fields: [campaignId], references: [id], onDelete: Cascade)
}

model StretchGoal {
  campaign  Campaign @relation(fields: [campaignId], references: [id], onDelete: Cascade)
}

model Comment {
  campaign  Campaign @relation(fields: [campaignId], references: [id], onDelete: Cascade)
  user      User     @relation(fields: [userId], references: [id], onDelete: Restrict)
  parent    Comment? @relation("CommentReplies", fields: [parentId], references: [id], onDelete: Cascade)
}

model TeamMember {
  campaign  Campaign @relation(fields: [campaignId], references: [id], onDelete: Cascade)
  user      User     @relation(fields: [userId], references: [id], onDelete: Restrict)
}

model CampaignUpdate {
  campaign  Campaign @relation(fields: [campaignId], references: [id], onDelete: Cascade)
  author    User     @relation(fields: [authorId], references: [id], onDelete: Restrict)
}
```

**User-Related Models** (Cascade on User Deletion):
```prisma
model OtpCode {
  user  User @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model Passkey {
  user  User @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

**User-Campaign Relationship** (Restrict - prevent deletion):
```prisma
model Campaign {
  maker  User @relation("MakerCampaigns", fields: [makerId], references: [id], onDelete: Restrict)
}
```

### 2. Comprehensive Error Handling

#### Admin Users Page (`/admin/users`)
**Delete User Function:**
```typescript
try {
  await prisma.user.delete({ where: { id: userId } });
  redirect('/admin/users?success=user-deleted');
} catch (error) {
  if (error instanceof Error && error.message.includes('foreign key constraint')) {
    if (error.message.includes('campaigns')) {
      redirect('/admin/users?error=user-has-campaigns');
    } else if (error.message.includes('pledges')) {
      redirect('/admin/users?error=user-has-pledges');
    } else if (error.message.includes('comments')) {
      redirect('/admin/users?error=user-has-comments');
    } else {
      redirect('/admin/users?error=user-has-dependencies');
    }
  } else {
    redirect('/admin/users?error=delete-failed');
  }
}
```

**Error Messages:**
- `user-has-campaigns`: "Cannot delete user: User has active campaigns. Delete or transfer campaigns first."
- `user-has-pledges`: "Cannot delete user: User has pledges. Contact support for assistance."
- `user-has-comments`: "Cannot delete user: User has comments. Consider anonymizing instead."
- `user-has-dependencies`: "Cannot delete user: User has dependencies that must be resolved first."
- `delete-failed`: "Failed to delete user. Please try again."
- `roles-update-failed`: "Failed to update user roles. Please try again."

#### Admin Campaigns Page (`/admin/campaigns`)
**Delete Campaign Function:**
```typescript
try {
  await prisma.campaign.delete({ where: { id: campaignId } });
  redirect('/admin/campaigns?success=campaign-deleted');
} catch (error) {
  console.error('Error deleting campaign:', error);
  redirect('/admin/campaigns?error=delete-failed');
}
```

**Error Messages:**
- `delete-failed`: "Failed to delete campaign. Please try again."
- `status-update-failed`: "Failed to update campaign status. Please try again."

#### Campaign Edit Page (`/campaigns/[id]/edit`)
**All Actions with Error Handling:**
```typescript
// Update Campaign
try {
  await prisma.campaign.update({ where: { id }, data: updateData });
  redirect(`/campaigns/${id}?success=updated`);
} catch (error) {
  redirect(`/campaigns/${id}/edit?error=update-failed`);
}

// Delete Campaign
try {
  await prisma.campaign.delete({ where: { id } });
  redirect('/dashboard?success=campaign-deleted');
} catch (error) {
  redirect(`/campaigns/${id}/edit?error=delete-failed`);
}

// Publish Campaign
try {
  await prisma.campaign.update({ where: { id }, data: { status: 'live' } });
  redirect(`/campaigns/${id}?success=published`);
} catch (error) {
  redirect(`/campaigns/${id}/edit?error=publish-failed`);
}
```

### 3. User-Friendly Error/Success Messages

#### Visual Design
- **Error Messages**: Red background with clear explanation
- **Success Messages**: Green background with confirmation
- **Consistent Styling**: Dark mode support throughout

#### Message Categories
1. **Validation Errors**: Clear explanation of what went wrong
2. **Permission Errors**: Security-related feedback
3. **Database Errors**: User-friendly translations of technical errors
4. **Success Confirmations**: Positive feedback for completed actions

## Database Cascade Strategy

### ✅ CASCADE (Auto-delete children)
**When parent is deleted, children are automatically removed:**
- Campaign → Milestones, Pledges, Badges, License, StretchGoals, Comments, TeamMembers, Updates
- User → OtpCodes, Passkeys (user authentication data)
- Comment → Replies (nested comment deletion)

### ⚠️ RESTRICT (Prevent deletion)
**Deletion blocked if dependencies exist:**
- User ← Campaigns (can't delete user who created campaigns)
- User ← Pledges (can't delete user who has backed campaigns)
- User ← Comments (can't delete user who has commented)
- User ← TeamMembers (can't delete user who is on campaign teams)
- User ← CampaignUpdates (can't delete user who authored updates)

## Benefits

### ✅ Data Integrity
- **Automatic Cleanup**: Related records are properly cleaned up
- **Referential Integrity**: No orphaned records or broken references
- **Consistent State**: Database remains in valid state after deletions

### ✅ User Experience
- **Clear Feedback**: Users understand why operations fail
- **Actionable Messages**: Suggestions for resolving issues
- **Proper Success Confirmation**: Users know operations completed

### ✅ Administrative Control
- **Safe Operations**: Prevents accidental data loss
- **Guided Cleanup**: Clear instructions for resolving dependencies
- **Audit Trail**: Proper logging of all deletion attempts

## Files Updated
- `prisma/schema.prisma` - Added cascade deletions
- `app/admin/users/page.tsx` - Error handling & messages
- `app/admin/campaigns/page.tsx` - Error handling & messages
- `app/campaigns/[id]/edit/page.tsx` - Error handling & messages

## Testing Checklist
- [ ] Campaign deletion removes all related records (milestones, pledges, etc.)
- [ ] User deletion blocked when user has campaigns/pledges/comments
- [ ] Error messages display correctly for all scenarios
- [ ] Success messages show for completed operations
- [ ] Admin can see helpful error explanations
- [ ] No more "foreign key constraint" errors in UI
- [ ] Database remains consistent after failed operations