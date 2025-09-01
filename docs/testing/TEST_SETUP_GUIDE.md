# VibeFunder Test Setup Guide

## 🚀 Quick Start

### Running Tests

```bash
# Run all tests with server (recommended)
npm run test:full

# Quick unit tests only (no server needed)
npm run test:unit

# Run specific test suites
npm run test:api        # API tests (needs server)
npm run test:payments   # Payment tests
npm run test:security   # Security tests

# Run tests with automatic cleanup
npm run test:clean

# Run tests with coverage report
npm run test:coverage
```

## 📋 Test Commands

### Basic Commands

| Command | Description | Server Required |
|---------|-------------|-----------------|
| `npm test` | Run all tests | No (skips API tests) |
| `npm run test:unit` | Unit tests only | No |
| `npm run test:integration` | Integration tests | Yes |
| `npm run test:api` | API endpoint tests | Yes |
| `npm run test:security` | Security tests | Yes |
| `npm run test:payments` | Payment flow tests | No |

### Advanced Commands

| Command | Description |
|---------|-------------|
| `npm run test:with-server` | Start server and run tests |
| `npm run test:full` | Full test suite with cleanup |
| `npm run test:clean` | Tests with data cleanup |
| `npm run test:coverage` | Generate coverage report |
| `npm run test:watch` | Watch mode for TDD |

### Server Commands

| Command | Description |
|---------|-------------|
| `npm run dev:test` | Start test server on port 3101 |
| `npm run api` | Start API server on port 3901 |

## 🔧 Configuration

### Environment Variables

```bash
# Test Database
TEST_DATABASE_URL=postgresql://user:pass@localhost:5432/vibefunder_test

# Test Server
TEST_PORT=3101
LOCAL_API=true

# Cleanup Settings
CLEANUP_TEST_DATA=true  # Auto-cleanup test data
CI=true                 # Auto-cleanup in CI

# Debug Options
DEBUG_TESTS=true        # Enable debug logging
DEBUG_DB=true          # Show database queries
```

### Test Timeouts

Configure in `jest.config.js`:
- Local: 30 seconds
- CI: 60 seconds
- Custom: Set via `jest.setTimeout()`

### Parallel Workers

Configure in `jest.config.js`:
- Local: 3 workers (prevents DB overload)
- CI: 2 workers (resource limited)

## 🗄️ Database Setup

### Create Test Database

```bash
# PostgreSQL
createdb vibefunder_test

# Run migrations
DATABASE_URL=$TEST_DATABASE_URL npx prisma migrate deploy

# Generate Prisma client
npx prisma generate
```

### Data Cleanup

Test data is automatically cleaned up when:
- `CLEANUP_TEST_DATA=true` is set
- Running in CI (`CI=true`)
- Using `npm run test:clean`

## 🎯 Test Categories

### Unit Tests (`__tests__/unit/`)
- Database connections
- Utility functions
- Business logic
- No external dependencies

### Integration Tests (`__tests__/integration/`)
- Full workflows
- Multiple components
- Database interactions
- Requires test database

### API Tests (`__tests__/api/`)
- REST endpoints
- Request/response validation
- Authentication
- **Requires test server on port 3101**

### Security Tests (`__tests__/security/`)
- SQL injection prevention
- XSS protection
- CSRF validation
- Rate limiting
- **Requires test server**

### Payment Tests (`__tests__/payments/`)
- Stripe integration
- Checkout flows
- Webhook handling
- Uses mocked Stripe API

## 🔍 Troubleshooting

### Common Issues

#### Tests Timing Out
```bash
# Increase timeout in test file
jest.setTimeout(60000);

# Or in jest.config.js
testTimeout: 60000
```

#### Database Connection Issues
```bash
# Check PostgreSQL is running
pg_isready

# Verify connection
psql $TEST_DATABASE_URL -c "SELECT 1"

# Reset database
DATABASE_URL=$TEST_DATABASE_URL npx prisma db push --force-reset
```

#### Port Already in Use
```bash
# Kill process on port 3101
lsof -ti:3101 | xargs kill -9

# Or use the built-in command
npm run dev:test  # Auto-kills existing process
```

#### Mock Setup Errors
```bash
# Clear Jest cache
jest --clearCache

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

## 📊 Coverage Reports

### Generate Coverage
```bash
# Basic coverage
npm run test:coverage

# HTML report
npm run coverage:html
open coverage/lcov-report/index.html

# Check thresholds
npm run coverage:check
```

### Coverage Thresholds
Configure in `jest.config.js`:
- Statements: 70%
- Branches: 60%
- Functions: 70%
- Lines: 70%

## 🤖 CI/CD Integration

### GitHub Actions
Tests run automatically on:
- Push to main/develop
- Pull requests
- Manual workflow dispatch

### CI Environment
- PostgreSQL service container
- Node.js 20
- Automatic test server startup
- Coverage reporting to Codecov
- Automatic data cleanup

## 🛠️ Development Workflow

### TDD Workflow
```bash
# 1. Start test watcher
npm run test:watch

# 2. Write failing test
# 3. Implement feature
# 4. Test passes
# 5. Refactor
```

### Pre-commit Hooks
Husky runs automatically:
- Linting
- Type checking
- Related tests
- Format checking

### Running Specific Tests
```bash
# Single file
npm test -- auth.test.ts

# Pattern matching
npm test -- --testNamePattern="should authenticate"

# Update snapshots
npm test -- -u
```

## 📝 Writing Tests

### Test Structure
```typescript
describe('Feature', () => {
  beforeAll(async () => {
    // Setup
  });

  afterAll(async () => {
    // Cleanup
  });

  test('should do something', async () => {
    // Arrange
    // Act
    // Assert
  });
});
```

### Using Test Helpers
```javascript
import { 
  testPrisma,
  createTestUser,
  cleanupTestData 
} from '@/tests/utils/test-helpers';

// Use testPrisma for database operations
const user = await testPrisma.user.create({...});

// Cleanup automatically
await cleanupTestData();
```

### Mocking Services
```javascript
import {
  prismaMock,
  authMock,
  stripeMock,
  setupDefaultMocks
} from '@/tests/payments/setup-payment-mocks';

// Setup default mocks
setupDefaultMocks();

// Custom mock responses
prismaMock.user.findUnique.mockResolvedValue(mockUser);
```

## 🚦 Test Status

### Currently Working
✅ Unit tests (database, utilities)  
✅ JWT authentication tests  
✅ Simple auth tests  
✅ Smoke tests  

### Requires Test Server
⏸️ API endpoint tests  
⏸️ Integration tests  
⏸️ Security tests  

### Needs Mock Fixes
🔧 Payment performance tests  
🔧 Payment security tests  
🔧 Stripe integration tests  

## 📚 Additional Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Testing Library](https://testing-library.com/docs/)
- [Prisma Testing Guide](https://www.prisma.io/docs/guides/testing)
- [Next.js Testing](https://nextjs.org/docs/testing)

---

For more information, see the [main testing documentation](./TESTING.md).