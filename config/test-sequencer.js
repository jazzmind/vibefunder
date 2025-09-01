const { DefaultSequencer } = require('@jest/test-sequencer');

/**
 * Custom test sequencer for optimal performance
 * Orders tests from fastest to slowest to provide early feedback
 */
class PerformanceSequencer extends DefaultSequencer {
  sort(tests) {
    // Define test priority order (fastest to slowest)
    const testPriority = {
      'unit': 1,
      'api': 2, 
      'integration': 3,
      'security': 4,
      'payments': 5,
      'smoke': 6,
    };

    const getTestType = (testPath) => {
      if (testPath.includes('/unit/')) return 'unit';
      if (testPath.includes('/api/')) return 'api';
      if (testPath.includes('/integration/')) return 'integration';
      if (testPath.includes('/security/')) return 'security';
      if (testPath.includes('/payments/')) return 'payments';
      if (testPath.includes('smoke')) return 'smoke';
      return 'unit'; // default to fastest
    };

    const getTestSize = (testPath) => {
      // Estimate test complexity based on file size and name patterns
      const fileName = testPath.split('/').pop();
      if (fileName.includes('performance') || fileName.includes('load')) return 3;
      if (fileName.includes('integration') || fileName.includes('full-workflow')) return 2;
      return 1; // Simple test
    };

    return tests
      .map(test => ({
        ...test,
        type: getTestType(test.path),
        priority: testPriority[getTestType(test.path)] || 1,
        size: getTestSize(test.path)
      }))
      .sort((a, b) => {
        // First sort by priority (test type)
        if (a.priority !== b.priority) {
          return a.priority - b.priority;
        }
        
        // Then by estimated size/complexity
        if (a.size !== b.size) {
          return a.size - b.size;
        }
        
        // Finally by file path for consistency
        return a.path.localeCompare(b.path);
      });
  }
}

module.exports = PerformanceSequencer;