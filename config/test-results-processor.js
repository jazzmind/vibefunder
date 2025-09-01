const fs = require('fs');
const path = require('path');

/**
 * Test results processor for performance monitoring
 * Tracks test execution times and identifies slow tests
 */
module.exports = (results) => {
  const performanceReport = {
    timestamp: new Date().toISOString(),
    totalTime: results.runTime,
    numTotalTests: results.numTotalTests,
    numPassedTests: results.numPassedTests,
    numFailedTests: results.numFailedTests,
    slowTests: [],
    fastTests: [],
    averageTestTime: 0,
  };

  let totalExecutionTime = 0;
  const testTimes = [];

  results.testResults.forEach(testResult => {
    const testTime = testResult.perfStats.end - testResult.perfStats.start;
    totalExecutionTime += testTime;
    
    const testInfo = {
      testPath: path.relative(process.cwd(), testResult.testFilePath),
      executionTime: testTime,
      numTests: testResult.numPassingTests + testResult.numFailingTests,
      status: testResult.numFailingTests > 0 ? 'failed' : 'passed'
    };

    testTimes.push(testInfo);

    // Identify slow tests (> 5 seconds)
    if (testTime > 5000) {
      performanceReport.slowTests.push(testInfo);
    }
    
    // Identify very fast tests (< 100ms)
    if (testTime < 100) {
      performanceReport.fastTests.push(testInfo);
    }
  });

  performanceReport.averageTestTime = totalExecutionTime / results.numTotalTests;
  
  // Sort by execution time
  performanceReport.slowTests.sort((a, b) => b.executionTime - a.executionTime);
  performanceReport.fastTests.sort((a, b) => a.executionTime - b.executionTime);

  // Save performance report
  const reportPath = path.join(process.cwd(), 'test-performance.json');
  fs.writeFileSync(reportPath, JSON.stringify(performanceReport, null, 2));

  // Log performance summary
  if (performanceReport.slowTests.length > 0) {
    console.log('\n🐌 Slowest Tests:');
    performanceReport.slowTests.slice(0, 5).forEach(test => {
      console.log(`  ${test.testPath}: ${(test.executionTime / 1000).toFixed(2)}s`);
    });
  }

  if (process.env.JEST_VERBOSE === 'true') {
    console.log(`\n📊 Test Performance Summary:`);
    console.log(`  Total Tests: ${results.numTotalTests}`);
    console.log(`  Total Time: ${(results.runTime / 1000).toFixed(2)}s`);
    console.log(`  Average Test Time: ${(performanceReport.averageTestTime / 1000).toFixed(3)}s`);
    console.log(`  Slow Tests (>5s): ${performanceReport.slowTests.length}`);
    console.log(`  Fast Tests (<100ms): ${performanceReport.fastTests.length}`);
  }

  return results;
};