# Test Performance Optimization Guide

## Overview

VibeFunder's Jest configuration is optimized for maximum performance and reliability. Tests should complete in under 5 minutes with proper parallelization.

## Performance Features

### 1. Dynamic Worker Allocation
- **Development**: Uses 80% of CPU cores
- **CI Environment**: Conservative memory usage (50% of cores, max 4)
- **Coverage Mode**: Reduced workers (30% of cores) due to memory overhead

### 2. Test Sequencing
Tests run in optimal order for fastest feedback:
1. **Unit tests** (fastest, ~100-500ms each)
2. **API tests** (medium, ~1-3s each)
3. **Integration tests** (slower, ~3-10s each) 
4. **Security tests** (variable, ~2-8s each)
5. **Payment tests** (slowest, ~5-30s each)

### 3. Memory Management
- Worker memory limit: 512MB per worker
- Max concurrent suites: 8
- Automatic cleanup and caching

## Test Scripts

### Basic Testing
```bash
# Run all tests with optimal performance
npm run test

# Run specific test suites
npm run test:unit        # Fastest - unit tests only
npm run test:api         # API endpoint tests
npm run test:integration # Integration workflows
npm run test:security    # Security and auth tests
npm run test:payments    # Payment processing tests
```

### Performance Testing
```bash
# High-performance parallel execution
npm run test:parallel

# Performance benchmarking tests
npm run test:performance

# Memory usage monitoring
npm run test:memory

# Debug mode (single worker, verbose)
npm run test:debug
```

### Coverage and Reporting
```bash
# Full coverage report
npm run test:coverage

# HTML coverage report
npm run test:coverage:html

# CI-optimized testing
npm run test:ci

# Test only staged files
npm run test:staged
```

### CI/CD Integration
```bash
# Sharded execution for CI
JEST_SHARD_INDEX=1 JEST_SHARD_COUNT=4 npm run test:shard

# Quick smoke tests
npm run test:smoke
```

## Configuration Details

### Coverage Thresholds
- **Global**: 70% branches, 75% functions, 80% lines/statements
- **lib/ directory**: 80% branches, 85% functions, 90% lines/statements

### Timeout Settings
- **Default**: 30 seconds per test
- **Performance tests**: 60 seconds
- **Smoke tests**: 10 seconds

### Transform Optimizations
- **Isolated modules**: Faster TypeScript compilation
- **ES2020 target**: Modern JavaScript features
- **Selective transforms**: Only transform necessary modules

## Performance Monitoring

### Automatic Reporting
After each test run, performance metrics are saved to `test-performance.json`:
- Total execution time
- Average test time
- Slowest tests (>5s)
- Fastest tests (<100ms)

### Performance Thresholds
- **Fast tests**: <100ms (unit tests)
- **Medium tests**: 100ms-5s (most integration tests)
- **Slow tests**: >5s (flagged for optimization)

## Environment Variables

### Performance Tuning
```bash
# Override test timeout
TEST_TIMEOUT=45000

# Enable verbose output
JEST_VERBOSE=true

# Silent mode
JEST_SILENT=true

# Custom test URL
API_TEST_URL=http://localhost:3101
```

### CI Configuration
```bash
# Enable CI mode
CI=true

# Shard configuration
JEST_SHARD=true
JEST_SHARD_INDEX=1
JEST_SHARD_COUNT=4
```

## Optimization Tips

### 1. Write Efficient Tests
```typescript
// ✅ Good: Fast unit test
describe('utility functions', () => {
  it('should format currency', () => {
    expect(formatCurrency(1000)).toBe('$10.00');
  });
});

// ❌ Avoid: Slow integration test for simple logic
describe('utility functions', () => {
  it('should format currency in full app context', async () => {
    const app = await startTestApp();
    const result = await app.request('/format/1000');
    expect(result.body).toBe('$10.00');
    await app.close();
  });
});
```

### 2. Use Test Categories
```typescript
// Unit tests in __tests__/unit/
// Integration tests in __tests__/integration/
// API tests in __tests__/api/
// Security tests in __tests__/security/
// Payment tests in __tests__/payments/
```

### 3. Mock External Dependencies
```typescript
// Mock slow external services
jest.mock('../lib/external-api', () => ({
  fetchData: jest.fn().mockResolvedValue(mockData)
}));
```

### 4. Use Test Groups
```typescript
// Group related tests for better parallelization
describe.each([
  ['user1', userData1],
  ['user2', userData2],
])('user operations for %s', (userName, data) => {
  // Tests here
});
```

## Troubleshooting

### Common Issues

#### Tests Running Slowly
1. Check `test-performance.json` for slow tests
2. Verify worker count: `console.log(os.cpus().length)`
3. Monitor memory usage with `--logHeapUsage`

#### Memory Issues
1. Reduce worker count: `--maxWorkers=2`
2. Run tests in sequence: `--runInBand`
3. Clear Jest cache: `npx jest --clearCache`

#### CI Timeouts
1. Use `npm run test:ci` for CI environments
2. Enable test sharding for large test suites
3. Adjust timeout: `TEST_TIMEOUT=60000`

### Performance Debugging
```bash
# Debug specific performance issues
npm run test:debug -- --testNamePattern="slow test name"

# Memory profiling
npm run test:memory -- __tests__/specific-test.test.ts

# Single test file analysis
npm run test __tests__/unit/specific.test.ts --verbose
```

## Best Practices

### Test Organization
1. **Unit tests**: Fast, isolated, no external dependencies
2. **Integration tests**: Test component interactions
3. **API tests**: Test endpoints with minimal setup
4. **End-to-end tests**: Full workflow validation (minimal count)

### Performance Guidelines
- Keep unit tests under 100ms each
- Limit integration tests to essential workflows
- Use setup/teardown efficiently
- Mock expensive operations
- Avoid unnecessary async operations

### CI/CD Integration
- Use `npm run test:ci` in CI environments
- Implement test sharding for large projects
- Cache test results and dependencies
- Run smoke tests on every commit
- Full test suite on pull requests

This configuration ensures VibeFunder tests run efficiently while maintaining comprehensive coverage and reliability.