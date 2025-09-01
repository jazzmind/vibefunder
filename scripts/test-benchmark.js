#!/usr/bin/env node

/**
 * Jest Performance Benchmark Script
 * Tests various Jest configurations to measure performance improvements
 */

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const BENCHMARK_RUNS = 3;
const TEST_COMMANDS = [
  {
    name: 'Unit Tests Only',
    command: 'npm run test:unit -- --passWithNoTests --silent',
    timeout: 60000
  },
  {
    name: 'Coverage Report',
    command: 'npm run test:coverage -- --passWithNoTests --silent',
    timeout: 120000
  },
  {
    name: 'CI Mode',
    command: 'npm run test:ci -- --passWithNoTests --silent',
    timeout: 90000
  }
];

function runCommand(command, timeout = 30000) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const child = exec(command, { 
      timeout,
      maxBuffer: 1024 * 1024 * 10 // 10MB buffer
    }, (error, stdout, stderr) => {
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      if (error) {
        console.log(`⚠️  Command failed but we'll record the timing: ${error.message}`);
        resolve({ duration, success: false, stdout, stderr, error: error.message });
      } else {
        resolve({ duration, success: true, stdout, stderr });
      }
    });
  });
}

async function runBenchmark() {
  console.log('🚀 Jest Performance Benchmark Starting...\n');
  console.log(`CPU Cores: ${require('os').cpus().length}`);
  console.log(`Node Version: ${process.version}`);
  console.log(`Jest Workers: ${process.env.CI ? '2 (CI)' : 'CPU-1 (Local)'}\n`);

  const results = {};

  for (const testConfig of TEST_COMMANDS) {
    console.log(`📊 Running: ${testConfig.name}`);
    const runs = [];

    for (let i = 1; i <= BENCHMARK_RUNS; i++) {
      console.log(`  Run ${i}/${BENCHMARK_RUNS}...`);
      try {
        const result = await runCommand(testConfig.command, testConfig.timeout);
        runs.push(result);
        console.log(`    ${result.success ? '✅' : '⚠️'} ${result.duration}ms`);
      } catch (error) {
        console.log(`    ❌ Failed: ${error.message}`);
        runs.push({ duration: testConfig.timeout, success: false, error: error.message });
      }
    }

    // Calculate statistics
    const durations = runs.map(r => r.duration);
    const successfulRuns = runs.filter(r => r.success);
    
    results[testConfig.name] = {
      runs: runs.length,
      successful: successfulRuns.length,
      average: Math.round(durations.reduce((a, b) => a + b, 0) / durations.length),
      min: Math.min(...durations),
      max: Math.max(...durations),
      successRate: `${Math.round((successfulRuns.length / runs.length) * 100)}%`
    };

    console.log(`  📈 Average: ${results[testConfig.name].average}ms\n`);
  }

  // Print final report
  console.log('📊 BENCHMARK RESULTS');
  console.log('='.repeat(60));
  
  for (const [name, stats] of Object.entries(results)) {
    console.log(`\n${name}:`);
    console.log(`  Success Rate: ${stats.successRate}`);
    console.log(`  Average Time: ${stats.average}ms`);
    console.log(`  Range: ${stats.min}ms - ${stats.max}ms`);
  }

  // Performance targets
  console.log('\n🎯 PERFORMANCE TARGETS');
  console.log('='.repeat(60));
  const unitTestTarget = results['Unit Tests Only']?.average < 30000;
  const coverageTarget = results['Coverage Report']?.average < 120000;
  const ciTarget = results['CI Mode']?.average < 90000;

  console.log(`Unit Tests < 30s: ${unitTestTarget ? '✅ PASS' : '❌ FAIL'} (${results['Unit Tests Only']?.average}ms)`);
  console.log(`Coverage < 2m: ${coverageTarget ? '✅ PASS' : '❌ FAIL'} (${results['Coverage Report']?.average}ms)`);
  console.log(`CI Mode < 1.5m: ${ciTarget ? '✅ PASS' : '❌ FAIL'} (${results['CI Mode']?.average}ms)`);

  const overallPass = unitTestTarget && coverageTarget && ciTarget;
  console.log(`\n🏆 Overall Performance: ${overallPass ? '✅ EXCELLENT' : '⚠️  NEEDS IMPROVEMENT'}`);

  // Save results
  const reportPath = path.join(__dirname, '../coverage/benchmark-report.json');
  fs.writeFileSync(reportPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    environment: {
      node: process.version,
      cpuCores: require('os').cpus().length,
      ci: !!process.env.CI
    },
    results,
    targets: {
      unitTests: unitTestTarget,
      coverage: coverageTarget,
      ci: ciTarget,
      overall: overallPass
    }
  }, null, 2));

  console.log(`\n📄 Report saved to: ${reportPath}`);
}

// Run the benchmark
runBenchmark().catch(console.error);