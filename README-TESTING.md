# VibeFunder Testing Guide

This guide covers the comprehensive testing infrastructure for VibeFunder, including AI services, API endpoints, database operations, and security testing.

## Quick Start

```bash
# Install dependencies (includes test dependencies)
npm install

# Run all tests
npm run test

# Run specific test suites
npm run test:unit       # Unit tests
npm run test:integration # Integration tests  
npm run test:ai         # AI service tests
npm run test:api        # API endpoint tests
npm run test:security   # Security tests

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## Test Infrastructure

### Universal Test Runner

VibeFunder uses a universal test runner that automatically:

- ✅ Reads `TEST_PORT` from `.env.local` (defaults to 3101)
- ✅ Kills any existing servers on the test port
- ✅ Starts a test server with `LOCAL_API=true`
- ✅ Waits for server readiness
- ✅ Runs Jest with proper environment variables
- ✅ Cleans up automatically on completion

### Environment Setup

Create a `.env.local` file with test configuration:

```bash
# Required for testing
TEST_PORT=3101
NEXTAUTH_SECRET="test-secret-key"
DATABASE_URL="postgresql://user:pass@localhost:5432/vibefunder_test"

# Optional - enables AI testing
OPENAI_API_KEY="sk-your-openai-key"

# Optional - enables payment testing  
STRIPE_SECRET_KEY="sk_test_your-stripe-key"

# Optional - enables file upload testing
AWS_ACCESS_KEY_ID="your-aws-key"
AWS_SECRET_ACCESS_KEY="your-aws-secret"
S3_BUCKET_NAME="test-bucket"
```

## Test Categories

### 1. AI Service Tests (`src/__tests__/ai/`)

Tests for AI-powered features:

- **Image Generation**: Tests OpenAI DALL-E integration
- **Content Processing**: Tests AI content analysis
- **Error Handling**: Tests fallbacks when AI services unavailable
- **Security**: Tests input sanitization for AI prompts

```bash
# Run AI tests
npm run test:ai

# Run specific AI test
npm run test src/__tests__/ai/image-generation.test.ts
```

### 2. API Endpoint Tests (`src/__tests__/api/`)

Tests for all API routes:

- **Campaign API**: CRUD operations, image generation, validation
- **Auth API**: Authentication flows, session management
- **Organization API**: Organization management
- **Payment API**: Stripe integration, checkout flows

```bash
# Run API tests
npm run test:api

# Run specific API test
npm run test src/__tests__/api/campaigns.test.ts
```

### 3. Database Tests (`src/__tests__/unit/`)

Tests for data models and operations:

- **Model Validation**: Required fields, constraints, defaults
- **Relationships**: Foreign keys, cascading deletes
- **Data Integrity**: Unique constraints, validation rules
- **Performance**: Query optimization, indexing

```bash
# Run unit tests
npm run test:unit

# Run database tests specifically
npm run test src/__tests__/unit/database.test.ts
```

### 4. Security Tests (`src/__tests__/security/`)

Comprehensive security testing:

- **Authentication**: Login flows, session management
- **Authorization**: Role-based access control
- **Input Validation**: SQL injection, XSS prevention
- **Rate Limiting**: DoS protection
- **Data Protection**: Sensitive data handling

```bash
# Run security tests
npm run test:security

# Run auth security tests
npm run test src/__tests__/security/auth.test.ts
```

### 5. Integration Tests (`src/__tests__/integration/`)

End-to-end workflow testing:

- **User Registration**: Complete signup flow
- **Campaign Creation**: From creation to publication
- **Backing Flow**: From discovery to pledge
- **Organization Setup**: Service provider workflows

```bash
# Run integration tests
npm run test:integration

# Run full workflow test
npm run test src/__tests__/integration/full-workflow.test.ts
```

## Test Utilities

### Test Helpers (`src/__tests__/utils/test-helpers.ts`)

Comprehensive utilities for test data creation:

```typescript
import { 
  createTestUser,
  createTestCampaign,
  createTestOrganization,
  cleanupTestData,
  generateTestEmail
} from '../utils/test-helpers';

// Create test user
const user = await createTestUser({
  email: generateTestEmail('test'),
  name: 'Test User',
  roles: ['user']
});

// Create test campaign
const campaign = await createTestCampaign({
  makerId: user.id,
  title: 'Test Campaign',
  summary: 'A test campaign'
});

// Cleanup after tests
afterAll(() => cleanupTestData());
```

### Authentication Helpers

```typescript
import { createAuthHeaders, createAdminAuthHeaders } from '../utils/test-helpers';

// Regular user auth
const headers = createAuthHeaders(userId);

// Admin user auth
const adminHeaders = createAdminAuthHeaders(adminUserId);

// Use in API calls
const response = await fetch('/api/campaigns', {
  method: 'POST',
  headers: createAuthHeaders(user.id),
  body: JSON.stringify(campaignData)
});
```

## Database Testing

### Test Database Setup

Tests use a separate test database to avoid affecting development data:

```bash
# Setup test database
createdb vibefunder_test

# The test runner automatically:
# 1. Applies schema with `prisma db push`
# 2. Generates Prisma client
# 3. Cleans up test data after each run
```

### Data Isolation

Each test file cleans up its data:

```typescript
afterAll(async () => {
  await cleanupTestData(); // Removes all test-related data
});
```

## AI Testing

### Mock vs Real AI Tests

Tests are designed to work with both mocked and real AI services:

```typescript
describe('AI Image Generation', () => {
  // Uses mocked OpenAI by default
  it('should generate image successfully', async () => {
    const result = await generateCampaignImage(campaign);
    expect(result).toBeTruthy();
  });

  // Real AI tests (skip if no API key)
  const hasRealApiKey = process.env.OPENAI_API_KEY?.startsWith('sk-');
  
  it.skipIf(!hasRealApiKey)('should generate real image', async () => {
    // Actual OpenAI API call
  });
});
```

### AI Test Configuration

- **Mocked Tests**: Run by default, fast execution
- **Real AI Tests**: Require valid API keys, slower execution  
- **Graceful Fallbacks**: Tests continue even if AI services unavailable

## Security Testing

### OWASP Testing Compliance

Security tests cover OWASP Top 10 vulnerabilities:

1. **Injection**: SQL injection, NoSQL injection prevention
2. **Broken Authentication**: Session management, password policies
3. **Sensitive Data**: Encryption, secure transmission
4. **XML External Entities**: Input validation
5. **Broken Access Control**: Authorization testing
6. **Security Misconfiguration**: Header testing, CORS policies
7. **Cross-Site Scripting**: XSS prevention
8. **Insecure Deserialization**: Input sanitization
9. **Known Vulnerabilities**: Dependency scanning
10. **Insufficient Logging**: Audit trail testing

### Security Test Examples

```typescript
it('should prevent SQL injection', async () => {
  const maliciousInput = "'; DROP TABLE users; --";
  const response = await fetch(`/api/users/${maliciousInput}`);
  expect(response.status).toBe(404); // Should not cause DB error
});

it('should enforce rate limiting', async () => {
  const requests = Array(20).fill().map(() => 
    fetch('/api/auth/send-otp', { 
      method: 'POST',
      body: JSON.stringify({ email: 'test@example.com' })
    })
  );
  
  const responses = await Promise.all(requests);
  const rateLimited = responses.filter(r => r.status === 429);
  expect(rateLimited.length).toBeGreaterThan(0);
});
```

## Performance Testing

### Load Testing

```typescript
it('should handle concurrent requests', async () => {
  const promises = Array(50).fill().map(() =>
    fetch('/api/campaigns')
  );
  
  const responses = await Promise.all(promises);
  responses.forEach(r => expect(r.status).toBe(200));
});
```

### Response Time Testing

```typescript
it('should respond within acceptable time', async () => {
  const start = Date.now();
  await fetch('/api/campaigns');
  const duration = Date.now() - start;
  
  expect(duration).toBeLessThan(2000); // 2 second limit
});
```

## Coverage Reporting

```bash
# Generate coverage report
npm run test:coverage

# Coverage reports available in:
# - Terminal output
# - coverage/lcov-report/index.html
```

### Coverage Targets

- **Statements**: > 80%
- **Branches**: > 75%  
- **Functions**: > 80%
- **Lines**: > 80%

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Test Suite
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_PASSWORD: test
        options: --health-cmd pg_isready --health-interval 10s
    
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - run: npm ci
      - run: npm run test:coverage
        env:
          DATABASE_URL: postgresql://postgres:test@localhost:5432/test
          NEXTAUTH_SECRET: test-secret
```

## Troubleshooting

### Common Issues

1. **Port Already in Use**
   ```bash
   # The universal test runner automatically handles this
   # But if needed manually:
   lsof -ti:3101 | xargs kill -9
   ```

2. **Database Connection Issues**
   ```bash
   # Ensure test database exists
   createdb vibefunder_test
   
   # Check DATABASE_URL in .env.local
   echo $DATABASE_URL
   ```

3. **OpenAI API Rate Limits**
   ```bash
   # AI tests gracefully handle rate limits
   # Real AI tests are skipped if no API key
   ```

4. **Memory Issues with Large Test Suites**
   ```bash
   # Run tests in smaller batches
   npm run test:unit
   npm run test:api
   npm run test:integration
   ```

### Debug Mode

```bash
# Run tests with debug output
DEBUG=vibefunder:* npm run test

# Run specific test with verbose output
npm run test src/__tests__/ai/image-generation.test.ts --verbose
```

## Best Practices

### Test Writing Guidelines

1. **Descriptive Test Names**: Use clear, specific test descriptions
2. **Arrange-Act-Assert**: Structure tests with clear setup, action, verification
3. **Test Isolation**: Each test should be independent
4. **Data Cleanup**: Always clean up test data
5. **Error Cases**: Test both success and failure scenarios

### Test Data Management

1. **Use Test Helpers**: Leverage provided utilities for data creation
2. **Unique Identifiers**: Use `generateTestEmail()` for unique test data
3. **Realistic Data**: Use realistic test data that matches production patterns
4. **Cleanup**: Always clean up after tests complete

### Security Testing

1. **Input Validation**: Test all user inputs for security issues
2. **Authentication**: Verify all endpoints require proper authentication
3. **Authorization**: Test role-based access controls
4. **Rate Limiting**: Verify protection against abuse

This comprehensive testing infrastructure ensures VibeFunder maintains high quality, security, and reliability standards while supporting AI-powered features.