# Analyzer Migration Plan

## Summary
We have successfully consolidated all analyzer functionality into the campaign edit form's analysis tab. The standalone analyzer page can now be deprecated.

## What Was Migrated

### ✅ Completed Migration
All functionality from `/app/campaigns/[id]/analyzer/page.tsx` has been integrated into the campaign edit form:

1. **Stored Analysis Loading**: Displays previously stored analysis results with status badges
2. **Scanner Configuration**: UI for selecting which scanners to run (semgrep, gitleaks, sbom)
3. **Master Plan Generation**: Enhanced with competitor research functionality
4. **Gap Analysis**: 
   - Auto-triggers when reports become available
   - Enhanced progress tracking with step-by-step status
   - Automatic SOW generation and storage
5. **Feature Presence Scanning**: Same table-based UI with all functionality
6. **Competitor Research**: Dedicated section with error handling
7. **SOW Display**: Shows generated Statement of Work when available
8. **Auto-saving**: All results automatically stored to database

### Key Improvements in Campaign Edit Form
- **Better UI**: More polished dark/light theme support, better spacing and layout
- **Persistent Storage**: All analysis results saved to `CampaignAnalysis` table
- **Campaign Context**: All analysis tied to specific campaign for better organization
- **Enhanced Progress Tracking**: Real-time status updates with step indicators
- **Auto-triggering**: Gap analysis runs as soon as scanner reports are ready

## Database Schema Added
```sql
model CampaignAnalysis {
  id              String   @id @default(cuid())
  campaignId      String   @unique
  masterPlan      Json?    // Master plan results
  gapAnalysis     Json?    // Gap analysis milestones
  featureScan     Json?    // Feature presence results
  sowMarkdown     String?  // Statement of Work
  repoUrl         String?  // Repository analyzed
  lastAnalyzedAt  DateTime?
  analysisVersion String?
}
```

## API Enhancements
All analyzer API routes now support `campaign_id` parameter for automatic storage:
- `/api/analyzer/master-plan`
- `/api/analyzer/gap`
- `/api/analyzer/features`
- `/api/analyzer/jobs/[jobId]/sow`

New route for retrieving stored analysis:
- `/api/campaigns/[id]/analysis`

## Migration Steps

### Phase 1: Redirect Old URLs ✅
Update the analyzer link in the campaign edit form to point to the new path:
```
/campaigns/${campaign.id}/analyzer?repo=${repoUrl}&campaignId=${campaign.id}
```

### Phase 2: Deprecation Notice (Optional)
Add a deprecation notice to the old analyzer page directing users to use the campaign edit form instead.

### Phase 3: Remove Old Page
Once confident that all functionality is working in the campaign edit form:
1. Delete `/app/campaigns/[id]/analyzer/page.tsx`
2. Remove related imports and dependencies
3. Update any remaining links

## Benefits of Consolidated Approach

1. **Better UX**: Users don't need to navigate between pages
2. **Persistent Results**: Analysis results are saved and can be viewed later
3. **Campaign Context**: All analysis tied to specific campaigns
4. **Reduced Maintenance**: Single codebase instead of duplicate functionality
5. **Enhanced Features**: Auto-triggering, better progress tracking, research integration

## Testing Checklist

- [ ] Master plan generation works and stores results
- [ ] Gap analysis auto-triggers when reports are ready
- [ ] Scanner configuration saves and applies correctly
- [ ] Feature scanning works with master plan features
- [ ] Competitor research displays properly
- [ ] SOW generation and display works
- [ ] Stored analysis loads on page refresh
- [ ] All results persist across browser sessions

## Rollback Plan
If issues are discovered, the old analyzer page is still available at `/campaigns/[id]/analyzer/page.tsx` and can be used as backup while issues are resolved.
