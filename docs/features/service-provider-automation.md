# Service Provider Auto-Generation

## Overview

VibeFunder includes an intelligent service provider profile generation system that automatically creates comprehensive business profiles from just a domain name. This feature leverages AI-powered web research to populate detailed service provider information.

## Features

### 1. Domain-Based Research
- **Service**: `ServiceProviderGenerationService`
- **Capabilities**:
  - Web research using Perplexity AI
  - Company information extraction
  - Service offering analysis
  - Team and leadership identification
  - Market positioning assessment

### 2. AI-Powered Profile Generation
- **Endpoint**: `POST /api/services/generate-from-domain`
- **Features**:
  - Comprehensive business profile creation
  - Professional service descriptions
  - Market positioning and value propositions
  - Contact information extraction
  - Social media and certification discovery

## Generated Profile Schema

### Complete Service Provider Profile
```typescript
{
  name: string;                    // Company/organization name
  description: string;             // Comprehensive service description
  website: string;                 // Primary website URL
  services: string[];              // List of primary services offered
  sectors: string[];               // Industry sectors served
  size: string;                    // Company size description
  location?: string;               // Primary business location
  founded?: string;                // Year founded or establishment date
  specialties: string[];           // Key specialties and expertise areas
  targetMarket: string;            // Primary target market and customer base
  valueProposition: string;        // Core value proposition
  contactInfo?: {
    email?: string;
    phone?: string;
    address?: string;
  };
  socialMedia?: {
    linkedin?: string;
    twitter?: string;
    facebook?: string;
  };
  certifications: string[];        // Professional certifications
  awards: string[];               // Notable awards or recognition
  keyPersonnel: Array<{
    name: string;
    role: string;
    background?: string;
  }>;
}
```

## API Endpoints

### Generate Service Provider Profile
```http
POST /api/services/generate-from-domain
Content-Type: application/json

{
  "domain": "https://company.com",
  "userPrompt": "Focus on their consulting services",
  "autoCreate": false
}
```

**Response:**
```json
{
  "success": true,
  "generated": {
    "name": "Acme Consulting LLC",
    "description": "Leading provider of strategic business consulting...",
    "website": "https://company.com",
    "services": [
      "Strategic Planning",
      "Business Process Optimization",
      "Digital Transformation"
    ],
    "sectors": [
      "Financial Services",
      "Healthcare",
      "Technology"
    ],
    "size": "50-200 employees",
    "location": "New York, NY",
    "founded": "2015",
    "specialties": [
      "Change Management",
      "Organizational Development",
      "Technology Integration"
    ],
    "targetMarket": "Mid-market and enterprise companies",
    "valueProposition": "We help organizations navigate complex transformations...",
    "contactInfo": {
      "email": "info@company.com",
      "phone": "+1-555-0123",
      "address": "123 Business Ave, New York, NY 10001"
    },
    "socialMedia": {
      "linkedin": "https://linkedin.com/company/acme-consulting",
      "twitter": "https://twitter.com/acmeconsulting"
    },
    "certifications": [
      "ISO 9001 Certified",
      "PMI Partner"
    ],
    "awards": [
      "Best Consulting Firm 2023 - Business Weekly"
    ],
    "keyPersonnel": [
      {
        "name": "John Smith",
        "role": "CEO & Founder",
        "background": "Former McKinsey partner with 15 years experience"
      }
    ]
  },
  "domain": "https://company.com"
}
```

## Research Process

### 1. Web Intelligence Gathering
The system uses Perplexity AI to research:
- Company background and history
- Service offerings and capabilities
- Leadership team and key personnel
- Market position and competitive advantages
- Contact information and social presence
- Certifications and awards
- Recent news and developments

### 2. Information Structuring
Research data is processed to create:
- **Professional Descriptions**: Clear, compelling service descriptions
- **Market Positioning**: Target audience and value proposition analysis
- **Credibility Indicators**: Certifications, awards, and team credentials
- **Contact Integration**: Verified contact information and social links

### 3. Quality Assurance
Generated profiles include:
- **Factual Accuracy**: Only verifiable information is included
- **Professional Tone**: Business-appropriate language and formatting
- **Completeness**: Comprehensive coverage of relevant business aspects
- **Consistency**: Unified voice and messaging throughout profile

## Integration Points

### Service Marketplace
- **Profile Creation**: Automatically populate service provider listings
- **Search Optimization**: Generate relevant tags and categories
- **Credibility Building**: Include verified credentials and achievements

### Campaign Integration
- **Service Partnerships**: Match campaigns with relevant service providers
- **Expert Validation**: Connect technical projects with industry experts
- **Resource Planning**: Identify service needs for campaign execution

## Error Handling

### Research Failures
- **Domain Inaccessible**: Clear messaging about domain verification
- **Insufficient Information**: Graceful handling of limited public data
- **API Limitations**: Retry logic and fallback strategies

### Content Generation Issues
- **Profile Completeness**: Handling missing information gracefully
- **Accuracy Validation**: Warnings about unverified information
- **Professional Standards**: Ensuring appropriate business language

## Usage Guidelines

### Best Practices
1. **Domain Verification**: Ensure domains are accessible and contain business information
2. **Context Provision**: Use `userPrompt` to provide specific requirements
3. **Review Process**: Always review generated profiles before publication
4. **Update Cycles**: Refresh profiles periodically for accuracy

### Quality Expectations
- **Accuracy**: Information should be factual and verifiable
- **Completeness**: Profiles should provide comprehensive business overview
- **Professional**: Content should meet business directory standards
- **Relevant**: Focus on information valuable to potential clients

## Future Enhancements

1. **Real-time Verification**: Cross-reference generated information with multiple sources
2. **Industry Templates**: Specialized profile formats for different industries
3. **Integration APIs**: Connect with business databases and directories
4. **Automated Updates**: Regular refresh of profile information
5. **Collaborative Editing**: Allow service providers to review and enhance profiles
6. **Performance Tracking**: Monitor profile effectiveness and engagement