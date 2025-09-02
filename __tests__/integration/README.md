# Integration Tests

Comprehensive end-to-end integration tests for VibeFunder platform covering complete user workflows and system interactions.

## Test Structure

### Test Files

- **`userJourney.test.ts`** - Complete user registration and onboarding flow
  - User registration with email verification
  - Profile setup and preferences
  - Email verification and OTP processes
  - First campaign discovery and pledge
  - Security settings and logout

- **`campaignLifecycle.test.ts`** - Campaign creation and management lifecycle
  - Organization and campaign creation
  - Milestone and pledge tier setup
  - Campaign publishing and validation
  - Progress updates and community interaction
  - Campaign completion and fulfillment

- **`paymentFlow.test.ts`** - Payment processing and transaction handling
  - Stripe checkout session creation
  - Payment webhook processing
  - Pledge confirmation and notifications
  - Payment failures and retry logic
  - Refund and cancellation processes

- **`adminWorkflow.test.ts`** - Administrative functions and platform management
  - Admin authentication and authorization
  - Campaign review and moderation
  - User management and account actions
  - Platform analytics and reporting
  - System configuration and compliance

## Mock Services

### Stripe Mock (`__tests__/mocks/stripe.mock.ts`)
- Complete Stripe API simulation
- Checkout session creation
- Payment intent processing
- Webhook event generation
- Error scenario simulation

### Email Mock (`__tests__/mocks/email.mock.ts`)
- Email sending simulation
- Template rendering
- Delivery tracking
- Failure simulation
- Email content verification

## Test Data Factories

### Factory Classes (`__tests__/utils/factories.ts`)
- **UserFactory** - Create realistic user profiles
- **OrganizationFactory** - Generate organization data
- **CampaignFactory** - Create campaigns with rich content
- **MilestoneFactory** - Generate project milestones
- **PledgeTierFactory** - Create pledge tier structures
- **PledgeFactory** - Generate pledge transactions
- **ScenarioFactory** - Complete workflow scenarios

## Running Integration Tests

### Prerequisites

1. **Database Setup**
   ```bash
   # Ensure test database is configured
   export TEST_DATABASE_URL="postgresql://user:pass@localhost:5432/vibefunder_test"
   
   # Run migrations
   npx prisma migrate deploy
   ```

2. **Test Server**
   ```bash
   # Start test server in background
   npm run dev:test
   ```

### Running Tests

```bash
# Run all integration tests
npm run test:integration

# Run specific test file
npx jest __tests__/integration/userJourney.test.ts

# Run with coverage
npx jest --config jest.integration.config.js --coverage

# Run with verbose output
npx jest --config jest.integration.config.js --verbose

# Watch mode (for development)
npx jest __tests__/integration --watch
```

### Full Test Suite

```bash
# Run complete test suite with server
npm run test:full

# Clean run (with data cleanup)
npm run test:clean
```

## Test Configuration

### Environment Variables

```bash
# Required
TEST_DATABASE_URL=postgresql://localhost:5432/vibefunder_test
API_TEST_URL=http://localhost:3101

# Optional (for external service tests)
STRIPE_SECRET_KEY=sk_test_...
OPENAI_API_KEY=sk-...
SMTP_HOST=smtp.example.com

# Test behavior
CLEANUP_TEST_DATA=true
DEBUG_TESTS=false
```

### Jest Configuration

- **Timeout**: 60 seconds per test
- **Workers**: 1 (serial execution)
- **Coverage**: API routes and business logic
- **Database**: Transaction-based isolation
- **Mocks**: Stripe, Email, External APIs

## Test Patterns

### 1. Complete User Flows

```typescript
describe('User Registration Flow', () => {
  it('should handle complete registration journey', async () => {
    // 1. User submits registration
    // 2. Email verification sent
    // 3. OTP verification
    // 4. Profile completion
    // 5. First interaction
  });
});
```

### 2. Multi-Service Integration

```typescript
it('should process payment with all integrations', async () => {
  // 1. Create Stripe checkout
  // 2. Process payment webhook
  // 3. Update database
  // 4. Send confirmation emails
  // 5. Trigger analytics
});
```

### 3. Error Handling

```typescript
it('should handle service failures gracefully', async () => {
  // 1. Simulate service failure
  // 2. Verify error handling
  // 3. Check recovery mechanisms
  // 4. Ensure data consistency
});
```

### 4. Performance Testing

```typescript
it('should handle concurrent operations', async () => {
  const promises = Array(10).fill(null)
    .map(() => performOperation());
  
  const results = await Promise.all(promises);
  expect(results.every(r => r.success)).toBe(true);
});
```

## Data Management

### Test Isolation

- Each test suite uses isolated data
- Automatic cleanup after test completion
- Factory-generated realistic data
- No test interdependencies

### Database State

- Tests run against clean database state
- Foreign key constraints respected
- Cascading deletes handled properly
- Transaction rollback for failures

### Mock Data

- Realistic user profiles and content
- Valid business scenarios
- Edge cases and error conditions
- Performance stress scenarios

## Debugging Tests

### Logging

```bash
# Enable debug logging
export DEBUG_TESTS=true
export DEBUG_DB=true

# Run with detailed output
npx jest --config jest.integration.config.js --verbose --no-cache
```

### Database Inspection

```bash
# Connect to test database
psql $TEST_DATABASE_URL

# View test data
SELECT * FROM campaigns WHERE title LIKE '%Test%';
SELECT * FROM users WHERE email LIKE '%@example.com';
```

### Mock Inspection

```typescript
// In tests - inspect mock calls
console.log('Emails sent:', emailMock.sentEmails);
console.log('Stripe calls:', stripeMock.stripe.checkout.sessions.create.mock.calls);
```

## Coverage Expectations

Integration tests provide:

- **API Route Coverage**: 80%+ of endpoint logic
- **Service Integration**: Cross-service workflows
- **Error Handling**: Failure scenarios
- **Edge Cases**: Boundary conditions
- **Performance**: Concurrent operations

## Continuous Integration

Integration tests run in CI/CD pipeline:

```yaml
# GitHub Actions example
- name: Run Integration Tests
  run: |
    npm run test:clean
  env:
    TEST_DATABASE_URL: ${{ secrets.TEST_DATABASE_URL }}
    STRIPE_SECRET_KEY: ${{ secrets.STRIPE_SECRET_KEY }}
```

## Troubleshooting

### Common Issues

1. **Database Connection**
   - Verify TEST_DATABASE_URL is set
   - Check database is running and accessible
   - Run migrations: `npx prisma migrate deploy`

2. **Test Server**
   - Ensure test server is running on correct port
   - Check API_TEST_URL matches server port
   - Verify no port conflicts

3. **Mock Services**
   - Check mock reset between tests
   - Verify mock implementations match real APIs
   - Ensure external service mocks are active

4. **Test Timeouts**
   - Increase timeout for slow operations
   - Check for hanging promises
   - Verify database connections close properly

### Performance Issues

- Run tests serially with `--runInBand`
- Use test database on SSD storage
- Optimize test data creation
- Profile slow tests with `--detectOpenHandles`

## Contributing

### Adding New Integration Tests

1. **Create Test File**
   - Follow naming convention: `feature.test.ts`
   - Use existing patterns and helpers
   - Include comprehensive scenarios

2. **Test Structure**
   ```typescript
   describe('Feature Integration', () => {
     beforeAll(async () => {
       await setupTestEnvironment();
     });
     
     afterAll(async () => {
       await teardownTestEnvironment();
     });
     
     describe('Happy Path', () => {
       // Success scenarios
     });
     
     describe('Error Handling', () => {
       // Failure scenarios
     });
   });
   ```

3. **Best Practices**
   - Test complete user workflows
   - Include error scenarios
   - Verify side effects (emails, analytics)
   - Use realistic test data
   - Clean up test data

### Extending Mock Services

1. **Add Mock Methods**
   - Mirror real API interfaces
   - Support success and failure cases
   - Include realistic delays
   - Track call history

2. **Update Factories**
   - Add new data types
   - Maintain realistic relationships
   - Support customization
   - Include edge cases

Integration tests ensure VibeFunder works correctly as a complete system, providing confidence in deployments and catching issues that unit tests might miss.
