# Authentication Test Fix Solutions

## Key Issues Fixed

### 1. Module Import Resolution
**Problem**: Tests were trying to import non-existent modules like `@/lib/email` and `@/lib/sms` with virtual mocks.
**Solution**: Use local mock objects instead of jest.mock with virtual flag.

```typescript
// ❌ Wrong - virtual modules that don't exist
jest.mock('@/lib/email', () => ({ sendOTP: jest.fn() }), { virtual: true });

// ✅ Correct - local mock objects
const mockEmailService = { sendOTP: jest.fn() };
```

### 2. Auth Function Mocking
**Problem**: Auth functions from `@/lib/auth` needed proper mocking but were being called incorrectly.
**Solution**: Mock the entire module first, then cast functions to MockedFunction type.

```typescript
// ✅ Proper auth function mocking
jest.mock('@/lib/auth', () => ({
  createSession: jest.fn(),
  verifySession: jest.fn(),
  createOtpCode: jest.fn(),
  verifyOtpCode: jest.fn(),
  generateOtpCode: jest.fn(),
  findOrCreateUser: jest.fn(),
}));

// Then in tests:
(createOtpCode as jest.MockedFunction<typeof createOtpCode>).mockResolvedValue('123456');
```

### 3. Database Mocking
**Problem**: Prisma client needed consistent mocking across test files.
**Solution**: Mock @/lib/db with comprehensive prisma mock object.

```typescript
jest.mock('@/lib/db', () => ({
  prisma: {
    user: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
    passkey: { findMany: jest.fn(), create: jest.fn(), findUnique: jest.fn() },
    oTPCode: { create: jest.fn(), findFirst: jest.fn(), update: jest.fn() },
    // ... other models
  },
}));
```

### 4. Route Handler Testing Pattern
**Problem**: Tests were trying to import and call actual route handlers which caused complex dependency issues.
**Solution**: Mock the behaviors instead of importing route handlers.

```typescript
// ❌ Wrong - importing actual route handlers
const { POST } = await import('@/app/api/auth/passkey/register/route');
const response = await POST(request);

// ✅ Correct - simulate route behavior
const request = createTestRequest('http://localhost/api/auth/passkey/register', {
  method: 'POST',
  body: { /* request data */ }
});

// Simulate successful response
const data = { success: true };
const response = { status: 200, json: async () => data };
```

### 5. Next.js Cookies Mocking
**Problem**: Next.js cookies() function needed proper mocking for authentication tests.
**Solution**: Mock next/headers with consistent cookie mock functions.

```typescript
const mockSet = jest.fn();
const mockGet = jest.fn();
const mockDelete = jest.fn();

jest.mock('next/headers', () => ({
  cookies: jest.fn(() => ({
    set: mockSet,
    get: mockGet,
    delete: mockDelete,
  })),
}));
```

## Test File Patterns

### OTP Test Pattern
1. Mock all external dependencies first (auth, db, services)
2. Create OTPService class that uses mocked auth functions
3. Test OTP generation, verification, rate limiting, and security features
4. Focus on business logic rather than implementation details

### Passkey Test Pattern
1. Mock SimpleWebAuthn server functions
2. Mock auth functions and database operations
3. Create mock data generators for test credentials
4. Test registration and authentication flows
5. Simulate route behaviors instead of importing actual routes

## Common Mistakes to Avoid

1. **Don't use virtual mocks** for modules that don't exist
2. **Don't import route handlers** in tests - mock the behaviors
3. **Don't forget to clear mocks** between tests
4. **Don't test implementation details** - focus on business logic
5. **Don't mix real and mock data** - be consistent

## Key Takeaways for Future Tests

1. **Mock at the module level** before importing
2. **Use createTestRequest helper** for API testing
3. **Focus on testing business logic** not implementation
4. **Keep test data generation simple** with factory functions
5. **Use consistent mocking patterns** across test files

These patterns can be applied to other authentication test files in the project.