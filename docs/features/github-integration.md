# GitHub Integration for Campaign Generation

## Overview

VibeFunder now supports automatic campaign generation from GitHub repositories. This feature allows users to link their GitHub repositories and automatically generate compelling campaign content based on their project's README and documentation.

## Features

### 1. GitHub Account Connection
- **Endpoint**: `POST /api/github/connect`
- **Purpose**: Connect user's GitHub account using a personal access token
- **Requirements**: Valid GitHub Personal Access Token with repository read permissions

### 2. Repository Content Extraction
- **Service**: `GitHubService`
- **Capabilities**:
  - Parse various GitHub URL formats
  - Extract repository metadata (name, description, language, topics)
  - Retrieve README.md content
  - Scan documentation directories (`docs/`, `documentation/`, `doc/`)
  - Support for both public and private repositories (with proper token)

### 3. AI-Powered Campaign Generation
- **Service**: `CampaignGenerationService`
- **Endpoint**: `POST /api/campaigns/generate-from-repo`
- **Features**:
  - Analyze repository structure and content
  - Generate compelling campaign narratives
  - Create realistic funding goals based on project complexity
  - Generate development milestones with percentages
  - Create tiered pledge rewards
  - Support custom user prompts for additional context

## Database Schema

### GitHubConnection Model
```prisma
model GitHubConnection {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  githubToken String   // Encrypted GitHub personal access token
  username    String?  // GitHub username
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@unique([userId]) // One GitHub connection per user
  @@index([userId])
}
```

### Campaign Updates
- Added GitHub integration to existing `Campaign` model
- Utilizes existing `repoUrl` field to store repository URL

## API Endpoints

### Connect GitHub Account
```http
POST /api/github/connect
Content-Type: application/json

{
  "githubToken": "ghp_xxxxxxxxxxxxxxxxxxxx"
}
```

**Response:**
```json
{
  "success": true,
  "username": "developer-username",
  "connectionId": "connection-id"
}
```

### Check GitHub Connection Status
```http
GET /api/github/connect
```

**Response:**
```json
{
  "connected": true,
  "connection": {
    "id": "connection-id",
    "username": "developer-username",
    "isActive": true,
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z"
  }
}
```

### Generate Campaign from Repository
```http
POST /api/campaigns/generate-from-repo
Content-Type: application/json

{
  "repoUrl": "https://github.com/username/project-name",
  "userPrompt": "Focus on the developer tool aspects",
  "autoCreate": false
}
```

**Response:**
```json
{
  "success": true,
  "generated": {
    "title": "Revolutionary Developer Tool",
    "summary": "Streamline your development workflow...",
    "description": "Detailed campaign description...",
    "fundingGoalDollars": 75000,
    "sectors": ["Technology", "Developer Tools"],
    "deployModes": ["SaaS", "Open Source"],
    "milestones": [...],
    "pledgeTiers": [...]
  },
  "repository": {
    "name": "project-name",
    "full_name": "username/project-name",
    "description": "Project description",
    "html_url": "https://github.com/username/project-name",
    "language": "TypeScript",
    "topics": ["developer-tools", "productivity"]
  }
}
```

## Usage Flow

1. **Connect GitHub Account**:
   - User provides GitHub Personal Access Token
   - System validates token and stores connection

2. **Select Repository**:
   - User provides repository URL
   - System extracts and analyzes repository content

3. **Generate Campaign**:
   - AI analyzes README, documentation, and metadata
   - Generates comprehensive campaign content
   - User can review and customize before creating

4. **Create Campaign** (Optional):
   - Set `autoCreate: true` to automatically create campaign
   - Includes milestones and pledge tiers
   - Campaign starts in 'draft' status

## Security Considerations

- GitHub tokens should be encrypted at rest (currently stored as plain text - needs implementation)
- Tokens are validated before storage
- One connection per user to prevent token proliferation
- Cascade deletion when user account is deleted

## Error Handling

- **Repository Not Found**: Clear error message with access verification suggestions
- **Invalid Token**: Token validation with specific error feedback  
- **No Documentation**: Requirement for README or docs with helpful suggestions
- **API Rate Limits**: Automatic retry logic and rate limiting

## Future Enhancements

1. **Token Encryption**: Implement proper encryption for stored GitHub tokens
2. **Organization Repositories**: Support for organization-owned repositories
3. **Branch Selection**: Allow selection of specific branches for analysis
4. **Continuous Updates**: Sync campaign updates with repository changes
5. **Multiple Repositories**: Support linking multiple repositories to one campaign