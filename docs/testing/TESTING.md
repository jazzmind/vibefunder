# VibeFunder Testing Documentation

## Overview

VibeFunder uses Jest as its primary testing framework with comprehensive test coverage for authentication, payments, API endpoints, and security features.

## Prerequisites

1. **PostgreSQL**: Ensure PostgreSQL is running locally
2. **Test Database**: Create a test database named `vibefunder-testing`
3. **Environment Variables**: Configure `TEST_DATABASE_URL` in `.env.local`:
   ```
   TEST_DATABASE_URL="postgresql://postgres:postgres@localhost:5432/vibefunder-testing"
   ```

## Test Structure

```
__tests__/
├── auth/                   # Authentication tests
│   ├── jwt-unit.test.ts   # JWT token tests (22 tests)
│   ├── jwt-auth.test.ts   # Auth integration tests
│   └── auth-edge-cases.test.ts  # Edge case testing
├── payments/              # Payment integration tests
│   ├── stripe-integration.test.ts
│   ├── payment-security.test.ts
│   └── payment-performance.test.ts
├── security/              # Security vulnerability tests
│   └── api-security.test.ts
├── api/                   # API endpoint tests
│   ├── campaigns.test.ts
│   ├── users.test.ts
│   └── stretch-goals.test.ts
├── setup/                 # Test configuration
│   ├── global.setup.js
│   ├── global.teardown.js
│   └── env.setup.js
└── utils/                 # Test utilities
    └── test-helpers.ts
```

## Running Tests

### All Tests
```bash
npm test
# or
npx jest
```

### Specific Test Suites
```bash
# Run authentication tests
npx jest __tests__/auth/

# Run payment tests
npx jest __tests__/payments/

# Run API tests
npx jest __tests__/api/

# Run security tests
npx jest __tests__/security/
```

### Individual Test Files
```bash
# Run JWT unit tests
npx jest __tests__/auth/jwt-unit.test.ts

# Run campaign API tests
npx jest __tests__/api/campaigns.test.ts
```

### Watch Mode
```bash
# Run tests in watch mode for development
npx jest --watch

# Watch specific directory
npx jest __tests__/auth/ --watch
```

## Coverage Reports

### Generate Coverage
```bash
# Run all tests with coverage
npx jest --coverage

# Coverage for specific suite
npx jest __tests__/auth/ --coverage

# Generate HTML coverage report
npx jest --coverage --coverageReporters=html
```

### View Coverage
- **Console**: Coverage summary is displayed after test execution
- **HTML Report**: Open `coverage/lcov-report/index.html` in browser
- **JSON**: Available at `coverage/coverage-summary.json`

### Coverage Targets
- **Statements**: 80%
- **Branches**: 80%
- **Functions**: 80%
- **Lines**: 80%

## Test Configuration

### Jest Configuration (`jest.config.js`)
- **Test Environment**: Node
- **TypeScript Support**: ts-jest preset
- **Parallel Execution**: 4 workers
- **Timeout**: 30 seconds per test
- **Module Resolution**: Supports `@/` path aliases

### Environment Setup
- Tests use `TEST_DATABASE_URL` when available
- Automatic database cleanup after each test
- Mock implementations for external services (Stripe, OpenAI, AWS)

## Writing Tests

### Test Template
```typescript
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { cleanupTestData } from '../utils/test-helpers';

describe('Feature Name', () => {
  beforeEach(async () => {
    await cleanupTestData();
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  describe('Specific Functionality', () => {
    it('should perform expected behavior', async () => {
      // Arrange
      const testData = { /* ... */ };
      
      // Act
      const result = await functionUnderTest(testData);
      
      // Assert
      expect(result).toBeDefined();
      expect(result.property).toBe('expected value');
    });
  });
});
```

### Custom Matchers
```typescript
// Available custom matchers from jest.setup.js
expect(url).toBeValidUrl();
expect(filename).toHaveValidImageFormat();
```

## Troubleshooting

### Common Issues

1. **Database Connection Errors**
   - Ensure PostgreSQL is running: `pg_isready`
   - Verify test database exists: `psql -U postgres -c "SELECT datname FROM pg_database WHERE datname = 'vibefunder-testing';"`
   - Check TEST_DATABASE_URL in `.env.local`

2. **Faker.js ESM Errors**
   - The project uses CommonJS require for Faker.js in test helpers
   - If you encounter ESM issues, check `jest.config.js` transformIgnorePatterns

3. **Test Timeouts**
   - Default timeout is 30 seconds
   - For longer operations, increase timeout: `jest.setTimeout(60000)`

4. **Database Cleanup Issues**
   - Tests automatically clean up test data
   - Manual cleanup: `npx jest --clearCache`

### Debug Mode
```bash
# Run tests with verbose output
npx jest --verbose

# Run with specific log level
DEBUG=* npx jest

# Run single test with debugging
node --inspect-brk ./node_modules/.bin/jest --runInBand __tests__/auth/jwt-unit.test.ts
```

## CI/CD Integration

### GitHub Actions
```yaml
- name: Setup Test Database
  run: |
    psql -U postgres -c "CREATE DATABASE \"vibefunder-testing\";"
    
- name: Run Tests
  env:
    TEST_DATABASE_URL: postgresql://postgres:postgres@localhost:5432/vibefunder-testing
  run: |
    npm test -- --coverage --ci
    
- name: Upload Coverage
  uses: codecov/codecov-action@v3
  with:
    file: ./coverage/lcov.info
```

## Test Categories

### Unit Tests
- JWT token generation and validation
- Pure function testing
- Utility function testing

### Integration Tests
- Database operations
- API endpoint testing
- Authentication flows
- Payment processing

### Security Tests
- SQL injection prevention
- XSS protection
- CSRF validation
- Input sanitization
- Rate limiting

### Performance Tests
- Response time benchmarks
- Concurrent request handling
- Memory usage optimization
- Database query efficiency

## Best Practices

1. **Isolation**: Each test should be independent
2. **Cleanup**: Always clean up test data
3. **Mocking**: Mock external services (Stripe, OpenAI, AWS)
4. **Descriptive Names**: Use clear, descriptive test names
5. **Arrange-Act-Assert**: Follow AAA pattern
6. **Edge Cases**: Test boundary conditions and error scenarios
7. **Security**: Include security-focused test cases

## Maintenance

### Regular Tasks
- Update test data for new features
- Refresh mock data structures when APIs change
- Review and update coverage targets
- Performance benchmark validation

### Adding New Tests
1. Create test file in appropriate directory
2. Import necessary test utilities
3. Write tests following existing patterns
4. Run tests locally before committing
5. Ensure coverage targets are met

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Testing Library](https://testing-library.com/docs/)
- [TypeScript Jest](https://kulshekhar.github.io/ts-jest/)
- [Prisma Testing Guide](https://www.prisma.io/docs/guides/testing)

---

**Note**: Tests use mocked external services and do not make real API calls or process actual payments during execution.