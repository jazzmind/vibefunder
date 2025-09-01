# CI/CD Pipeline Documentation

## Overview

VibeFunder uses a comprehensive CI/CD pipeline built on GitHub Actions to ensure code quality, security, and reliability. The pipeline includes automated testing, coverage reporting, security auditing, and deployment processes.

## Pipeline Components

### 1. Test Coverage Workflow (`.github/workflows/test.yml`)

The main CI/CD workflow runs on:
- Push to `main` and `develop` branches  
- Pull requests to `main` and `develop` branches

#### Jobs:

**Test & Coverage Job:**
- Runs on Ubuntu latest with Node.js 20
- Sets up PostgreSQL 15 test database with npm dependency caching
- Installs dependencies and runs migrations
- Executes comprehensive test suite with coverage
- Generates HTML and LCOV coverage reports
- Enforces 10% coverage threshold (starting point, will increase over time)
- Uploads coverage to Codecov
- Comments PR with coverage delta

**Lint & Format Job:**
- Runs ESLint with zero warnings policy
- Checks Prettier formatting
- Validates TypeScript compilation

**Security Audit Job:**
- Runs npm audit for high-severity vulnerabilities
- Checks dependencies with audit-ci

### 2. Coverage Configuration

#### Codecov Integration (`codecov.yml`)

**Coverage Targets:**
- Project coverage: 10% minimum (starting threshold, will increase over time)
- Patch coverage: 10% minimum for new code
- Threshold: 5% variance allowed

**Ignored Files:**
- Test files (`*.test.ts`, `*.spec.ts`)
- Configuration files
- Build artifacts
- Prisma migrations

#### Coverage Scripts (`package.json`)

```bash
# Run tests with coverage for CI
npm run test:ci

# Generate HTML coverage report
npm run coverage:html

# Generate LCOV coverage report  
npm run coverage:lcov

# Check coverage thresholds
npm run coverage:check
```

### 3. Pre-commit Hooks (`.husky/pre-commit`)

Automated checks before each commit:

1. **File Validation**: Checks staged TypeScript/JavaScript files
2. **TypeScript Check**: Validates type safety
3. **ESLint**: Code quality and style enforcement (zero warnings)
4. **Prettier**: Code formatting validation
5. **Test Execution**: Runs tests for modified test files
6. **Test Coverage**: Warns about missing test files for critical components
7. **Quick Coverage**: Optional coverage check for critical files

#### Setup Pre-commit Hooks

```bash
# Install Husky (done automatically via package.json prepare script)
npm run prepare

# Make pre-commit hook executable
chmod +x .husky/pre-commit
```

### 4. Coverage Threshold Enforcement

The CI pipeline enforces minimum coverage thresholds:

- **Lines**: 10% (starting threshold, will increase over time)
- **Statements**: 10%  
- **Functions**: 10%
- **Branches**: 10%

Coverage is extracted from Jest's coverage summary and validated before allowing builds to pass.

### 5. Security Auditing

#### Configuration (`.audit-ci.json`)

- Fails CI on moderate, high, or critical vulnerabilities
- Includes both production and development dependencies
- Provides summary report format

#### Security Checks

```bash
# Run security audit
npm audit --audit-level=high

# Run enhanced dependency check
npx audit-ci --config .audit-ci.json
```

## Coverage Badges

Add these badges to your README:

```markdown
[![codecov](https://codecov.io/gh/yourusername/vibefunder/branch/main/graph/badge.svg)](https://codecov.io/gh/yourusername/vibefunder)
[![CI](https://github.com/yourusername/vibefunder/workflows/Test%20Coverage%20CI%2FCD/badge.svg)](https://github.com/yourusername/vibefunder/actions)
```

## Local Development Workflow

### Before Committing

```bash
# Check types
npm run type-check

# Lint and fix issues
npm run lint -- --fix

# Format code
npm run format:fix

# Run tests with coverage
npm run test:coverage

# Check coverage thresholds
npm run coverage:check
```

### Testing Commands

```bash
# Run all tests
npm test

# Run specific test suites
npm run test:unit
npm run test:integration  
npm run test:api
npm run test:security

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## Environment Variables

### Required for CI

```bash
# GitHub Secrets
CODECOV_TOKEN=your_codecov_token
GITHUB_TOKEN=automatically_provided

# Database (automatically set in CI)
DATABASE_URL=postgresql://vibefunder:test123@localhost:5432/vibefunder_test
NODE_ENV=test
```

### Local Development

Create `.env.local`:

```bash
DATABASE_URL="postgresql://username:password@localhost:5432/vibefunder_dev"
NEXTAUTH_SECRET="your-secret"
NEXTAUTH_URL="http://localhost:3900"
```

## Troubleshooting

### Coverage Issues

1. **Low Coverage**: Add tests to increase coverage above 10% (current threshold)
2. **Missing LCOV File**: Run `npm run coverage:lcov` to generate
3. **Threshold Failures**: Check `scripts/coverage-check.ts` output

### CI/CD Failures

1. **Test Failures**: Check test logs in GitHub Actions
2. **Lint Failures**: Run `npm run lint -- --fix` locally
3. **Format Failures**: Run `npm run format:fix` locally  
4. **Security Failures**: Address vulnerabilities with `npm audit fix`

### Pre-commit Hook Issues

```bash
# Skip pre-commit hooks (not recommended)
git commit --no-verify

# Fix hook permissions
chmod +x .husky/pre-commit

# Reinstall hooks
npm run prepare
```

### Database Issues in CI

1. **Migration Failures**: Ensure migrations are compatible with test DB
2. **Connection Issues**: Check PostgreSQL service configuration
3. **Timeout Issues**: Verify health checks are working

## Best Practices

### Testing

- Write tests before implementing features (TDD)
- Aim for >90% coverage on critical business logic (start with 10%, increase gradually)
- Include integration tests for API endpoints
- Test error conditions and edge cases

### Code Quality

- Zero ESLint warnings policy
- Consistent code formatting with Prettier  
- Meaningful test descriptions and assertions
- Proper error handling and logging

### Security

- Regular dependency updates
- Monitor security advisories
- Validate all user inputs
- Use environment variables for secrets

### CI/CD Optimization

- Cache dependencies for faster builds
- Run tests in parallel when possible
- Use matrix builds for multiple Node.js versions
- Monitor pipeline performance metrics

## Monitoring and Metrics

### Coverage Tracking

- Monitor coverage trends over time
- Set up alerts for coverage drops
- Review uncovered lines regularly

### Pipeline Performance

- Track build times and optimize
- Monitor test execution duration
- Review artifact sizes

### Security Monitoring

- Regular security audit reviews
- Automated vulnerability scanning
- Dependency update automation

## Future Enhancements

### Planned Improvements

1. **E2E Testing**: Playwright integration
2. **Visual Testing**: Screenshot comparison
3. **Performance Testing**: Lighthouse CI
4. **Deploy Previews**: Vercel/Netlify integration
5. **Multi-environment**: Staging deployment pipeline

### Advanced Features

- Semantic versioning automation
- Changelog generation  
- Release automation
- Canary deployments
- Feature flag integration

---

*Last updated: $(date)*