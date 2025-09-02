# Stripe Payment Tests - Fix Summary and Reusable Patterns

## Issues Identified and Fixed

### 1. Import Path Issues
**Problem**: Test files couldn't find the mock setup file
- `payment-intent.test.ts` and `subscription.test.ts` had incorrect paths to `setup-payment-mocks`
- **Fix**: Updated import paths from `../payments/` to `../../payments/`

### 2. Mock Configuration Issues
**Problem**: Stripe constants were undefined, causing test failures
- Missing Stripe constants in mock setup
- Inconsistent mock function setup
- **Fix**: Added proper Stripe constants export and consistent mock patterns

### 3. Auth Mock Setup
**Problem**: Authentication mocking inconsistencies
- `authMock` vs `mockAuth` naming conflicts
- Improper auth session mocking
- **Fix**: Standardized on `mockAuth` and proper session structure

### 4. Payment Intent Test Fixes
**Problem**: Mock function calls using old patterns
- Using `jest.fn().mockResolvedValue()` instead of direct `mockResolvedValue()`
- **Fix**: Updated to use consistent mock patterns

### 5. Subscription Test Architecture
**Problem**: Tests were calling non-existent API methods
- `mockSubscriptionAPI` had empty implementations
- Missing webhook handling methods
- **Fix**: Implemented proper mock API methods with realistic behavior

## Reusable Patterns Established

### 1. Stripe Mock Setup Pattern
```typescript
// Mock Stripe with proper constants
jest.mock('@/lib/stripe', () => ({
  __esModule: true,
  stripe: require('../../payments/setup-payment-mocks').stripeMock,
  STRIPE_CURRENCY: 'usd',
  STRIPE_PRICE_DOLLARS: 1,
  STRIPE_APP_FEE_BPS: 500,
  DEST_ACCOUNT: 'acct_test_destination',
}));
```

### 2. Auth Mock Pattern
```typescript
// Mock auth with proper typing
jest.mock('@/lib/auth', () => ({
  __esModule: true,
  auth: jest.fn()
}));

// In test setup
const mockAuth = auth as jest.MockedFunction<typeof auth>;
mockAuth.mockResolvedValue({
  user: { id: 'user-123', email: 'test@example.com' }
});
```

### 3. Prisma Mock Patterns
```typescript
// User creation/retrieval
prismaMock.user.upsert.mockResolvedValue({
  id: 'user-123',
  email: 'test@example.com',
  name: 'test',
  roles: ['backer'],
  createdAt: new Date(),
  updatedAt: new Date()
});

// Campaign with pledge tiers
prismaMock.campaign.findUnique.mockResolvedValue({
  ...campaignData,
  pledgeTiers: [/* tier data */]
});
```

### 4. Stripe Mock Function Calls
```typescript
// Correct pattern - use direct mockResolvedValue
stripeMock.paymentIntents.create.mockResolvedValue(paymentIntentData);

// Avoid this pattern
stripeMock.paymentIntents.create = jest.fn().mockResolvedValue(data);
```

### 5. Mock API Implementation Pattern
```typescript
const mockAPI = {
  create: jest.fn().mockImplementation(async (data) => {
    // Handle specific test scenarios
    if (data.errorCondition) {
      return { error: 'Error message', code: 'ERROR_CODE' };
    }
    return { success: true, id: 'created_id' };
  }),
  retrieve: jest.fn().mockResolvedValue(defaultResponse),
  // ... other methods
};
```

## Current Test Status

### ✅ Fixed and Working
- **payment-intent.test.ts**: All 30 tests passing
- Import path issues resolved
- Mock configuration standardized
- Auth patterns consistent

### ⚠️ Partially Fixed
- **checkout.test.ts**: Mock setup fixed, but needs API route testing approach
- **subscription.test.ts**: Mock API implemented, but test architecture needs simplification

### 🔄 Webhook Tests
- **webhook.test.ts**: Already working correctly - good reference pattern

## Recommendations for Team

1. **Use webhook.test.ts as the reference pattern** for new Stripe tests
2. **Simplify complex test suites** - avoid testing non-existent API endpoints
3. **Focus on actual Stripe API integration** rather than mock API layers
4. **Standardize mock patterns** across all payment tests
5. **Keep test data factories** for consistent test data generation

## Key Files Updated
- `__tests__/payments/setup-payment-mocks.ts` - Enhanced with constants and missing methods
- `__tests__/api/stripe/payment-intent.test.ts` - Fixed import paths and mock patterns
- `__tests__/api/stripe/subscription.test.ts` - Implemented mock API methods
- `__tests__/api/stripe/checkout.test.ts` - Fixed auth mocking and imports

## Performance Impact
- Payment intent tests: ~5.4s (30 tests)
- Mock setup is efficient and reusable
- Proper cleanup prevents memory leaks

## Next Steps
1. Simplify subscription tests to focus on core Stripe integration
2. Create actual API endpoint tests for checkout functionality
3. Establish testing patterns documentation
4. Regular mock pattern consistency checks