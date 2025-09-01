#!/usr/bin/env tsx

/**
 * Coverage threshold checker for VibeFunder
 * Enforces minimum coverage requirements for CI/CD pipeline
 */

import fs from 'fs/promises';
import path from 'path';

interface CoverageSummary {
  total: {
    lines: { pct: number };
    statements: { pct: number };
    functions: { pct: number };
    branches: { pct: number };
  };
}

const COVERAGE_THRESHOLDS = {
  lines: 80,
  statements: 80,
  functions: 80,
  branches: 70, // Slightly lower for branches as they're harder to achieve
};

async function checkCoverage() {
  try {
    const coveragePath = path.join(process.cwd(), 'coverage', 'coverage-summary.json');
    
    // Check if coverage file exists
    try {
      await fs.access(coveragePath);
    } catch (error) {
      console.error('❌ Coverage file not found. Run tests with coverage first.');
      process.exit(1);
    }

    // Read coverage summary
    const coverageData = await fs.readFile(coveragePath, 'utf-8');
    const coverage: CoverageSummary = JSON.parse(coverageData);

    console.log('📊 Coverage Report:');
    console.log('==================');

    const metrics = [
      { name: 'Lines', value: coverage.total.lines.pct, threshold: COVERAGE_THRESHOLDS.lines },
      { name: 'Statements', value: coverage.total.statements.pct, threshold: COVERAGE_THRESHOLDS.statements },
      { name: 'Functions', value: coverage.total.functions.pct, threshold: COVERAGE_THRESHOLDS.functions },
      { name: 'Branches', value: coverage.total.branches.pct, threshold: COVERAGE_THRESHOLDS.branches },
    ];

    let allPassed = true;

    metrics.forEach(({ name, value, threshold }) => {
      const status = value >= threshold ? '✅' : '❌';
      const color = value >= threshold ? '\x1b[32m' : '\x1b[31m';
      const reset = '\x1b[0m';
      
      console.log(`${status} ${name}: ${color}${value.toFixed(2)}%${reset} (threshold: ${threshold}%)`);
      
      if (value < threshold) {
        allPassed = false;
      }
    });

    console.log('==================');

    if (allPassed) {
      console.log('✅ All coverage thresholds met!');
      process.exit(0);
    } else {
      console.error('❌ Coverage thresholds not met. Please add more tests.');
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ Error checking coverage:', error);
    process.exit(1);
  }
}

// Run coverage check
checkCoverage();