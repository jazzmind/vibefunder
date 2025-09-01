# VibeFunder Payment System Tests

This directory contains comprehensive tests for VibeFunder's Stripe payment integration, covering functionality, security, and performance aspects.

## 🔧 ESM/CommonJS Resolution (RESOLVED)

**Issue**: Payment tests were failing with "Cannot use import statement outside a module" errors when importing `@faker-js/faker`.

**Solution**: Replaced Faker.js dependency with a custom `mock-data-generator.ts` that provides equivalent functionality without ESM/CommonJS compatibility issues.

**Benefits**:
- ✅ No more import errors
- ✅ Faster test execution
- ✅ No external dependencies
- ✅ Consistent, reliable test data

All payment tests now run successfully without module import issues.

## 🧪 Test Structure

### Core Test Files

- **`stripe-integration.test.ts`** - Main integration tests for Stripe payment flows
- **`payment-security.test.ts`** - Security-focused tests including injection prevention, authentication, and data validation
- **`payment-performance.test.ts`** - Performance and load testing for payment operations
- **`payment-test-helpers.ts`** - Utility functions, mock factories, and test data generators
- **`run-payment-tests.js`** - Test runner with various execution options

## 🚀 Quick Start

### Run All Payment Tests
```bash
node __tests__/payments/run-payment-tests.js
```

### Run Specific Test Suites
```bash
# Integration tests only
node __tests__/payments/run-payment-tests.js --suite=integration

# Security tests with coverage
node __tests__/payments/run-payment-tests.js --suite=security --coverage

# Performance tests in verbose mode
node __tests__/payments/run-payment-tests.js --suite=performance --verbose
```

### Development Workflow
```bash
# Watch mode for active development
node __tests__/payments/run-payment-tests.js --watch

# Run with coverage reporting
node __tests__/payments/run-payment-tests.js --coverage
```

## 📋 Test Coverage Areas

### ✅ Checkout Session Creation
- Valid payment flow validation
- Campaign status verification
- Pledge tier validation
- Amount calculation and fee handling
- User authentication scenarios
- Error handling and edge cases

### ✅ Webhook Event Processing
- Signature verification
- Event type handling (`checkout.session.completed`, `payment_intent.succeeded`, `payment_intent.payment_failed`)
- Database transaction management
- Email notification triggering
- Idempotency and duplicate event handling

### ✅ Security Testing
- Input validation and sanitization
- SQL injection prevention
- XSS attack prevention
- Authentication bypass attempts
- Rate limiting validation
- Environment security checks

### ✅ Performance Testing
- Response time benchmarking
- Concurrent request handling
- Memory usage optimization
- Database operation efficiency
- Large payload processing
- Error recovery performance

### ✅ Edge Cases and Error Scenarios
- Network failures
- Database connection issues
- Stripe API errors
- Malformed data handling
- Race condition management

## 🛡️ Security Test Categories

### Input Validation
- SQL injection payloads
- XSS script injections
- Parameter tampering
- Malicious amount values
- Invalid email formats

### Authentication & Authorization
- Unauthenticated access attempts
- Session hijacking prevention
- Role-based access validation
- Cross-user data access prevention

### Webhook Security
- Signature verification bypass attempts
- Replay attack prevention
- Malformed JSON handling
- Event structure validation

### Environment Security
- Missing configuration handling
- Sensitive data exposure prevention
- Error message information leakage

## ⚡ Performance Benchmarks

### Expected Performance Metrics
- **Checkout Session Creation**: < 1 second
- **Webhook Processing**: < 500ms
- **Concurrent Requests**: 10+ simultaneous requests
- **Memory Usage**: < 50MB increase during testing

### Load Testing Scenarios
- High-volume webhook processing (50+ events)
- Concurrent checkout sessions (10+ simultaneous)
- Large payload handling
- Database operation optimization

## 🏗️ Test Architecture

### Mock Strategy
- **Stripe API**: Comprehensive mocking using jest.mock()
- **Database**: Prisma client mocking for isolated testing
- **External Services**: Email service mocking
- **Authentication**: Auth module mocking

### Test Data Management
- **Factory Pattern**: StripeObjectFactory for consistent test data
- **Random Data Generation**: Faker.js for realistic test scenarios
- **Test Helpers**: Reusable assertion and utility functions

### Environment Isolation
- **Unit Tests**: Fully mocked environment
- **Integration Tests**: Test database with real connections
- **Performance Tests**: Optimized for speed measurement

## 🔧 Configuration

### Environment Variables
```bash
# Required for testing
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_CURRENCY=usd
STRIPE_PRICE_DOLLARS=2000000
STRIPE_APPLICATION_FEE_BPS=500
STRIPE_DESTINATION_ACCOUNT_ID=acct_...
```

### Jest Configuration
Tests inherit from the main Jest configuration (`jest.config.js`) with payment-specific optimizations:
- 30-second timeout for integration tests
- Parallel execution for performance tests
- Coverage thresholds: 80% across all metrics

## 📊 Test Reporting

### Coverage Reports
- **HTML Report**: `./coverage/lcov-report/index.html`
- **Text Summary**: Console output during test execution
- **LCOV Format**: `./coverage/lcov.info` for CI integration

### Performance Metrics
- Response time measurements
- Memory usage tracking
- Concurrent request success rates
- Database operation efficiency

## 🚦 CI/CD Integration

### GitHub Actions
```yaml
- name: Run Payment Tests
  run: |
    node __tests__/payments/run-payment-tests.js --suite=all --coverage
    
- name: Upload Coverage
  uses: codecov/codecov-action@v1
  with:
    file: ./coverage/lcov.info
```

### Pre-commit Hooks
```bash
# Run security tests before commit
node __tests__/payments/run-payment-tests.js --suite=security --bail
```

## 🐛 Debugging Tests

### Common Issues
1. **Mock Reset Issues**: Ensure `jest.clearAllMocks()` in `beforeEach`
2. **Async Timing**: Use proper `await` for async operations
3. **Environment Variables**: Check test environment setup
4. **Database State**: Verify mock responses match expected data structure

### Debug Mode
```bash
# Run with verbose Jest output
node __tests__/payments/run-payment-tests.js --verbose

# Run single test file
npx jest __tests__/payments/stripe-integration.test.ts --verbose
```

## 📚 Test Data Reference

### Mock Objects
- **Campaigns**: Published status, valid pledge tiers
- **Users**: Backer role, valid email addresses
- **Pledges**: Various amounts, payment references
- **Stripe Objects**: Realistic IDs and structure

### Test Scenarios
- **Happy Path**: Successful payment flows
- **Error Cases**: API failures, validation errors
- **Edge Cases**: Boundary values, race conditions
- **Security Cases**: Attack simulations, input validation

## 🔄 Maintenance

### Regular Tasks
- Update test data for new features
- Refresh Stripe API version compatibility
- Performance benchmark validation
- Security test payload updates

### Version Updates
- Stripe SDK updates require mock adjustments
- Database schema changes need test data updates
- New payment flows require test coverage

## 📞 Support

For questions or issues with payment tests:
1. Check test output for specific error messages
2. Verify environment variable configuration
3. Ensure all required dependencies are installed
4. Review Jest and testing framework documentation

---

**Note**: These tests use mocked Stripe API calls and do not process real payments or incur charges during execution.