const { createDefaultResolver } = require('enhanced-resolve');
const path = require('path');

/**
 * Custom resolver for faster module resolution
 * Caches resolutions and provides optimized lookup paths
 */
const customResolver = createDefaultResolver({
  // Cache for better performance
  cache: true,
  
  // Optimize extension resolution order
  extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
  
  // Prioritize common directories
  modules: [
    'node_modules',
    path.resolve(__dirname, '../lib'),
    path.resolve(__dirname, '../app'),
    path.resolve(__dirname, '../components'),
  ],
  
  // Alias resolution for faster lookups
  alias: {
    '@': path.resolve(__dirname, '..'),
    '@lib': path.resolve(__dirname, '../lib'),
    '@app': path.resolve(__dirname, '../app'),
    '@components': path.resolve(__dirname, '../components'),
  },
});

module.exports = (request, options) => {
  try {
    return customResolver.resolveSync({}, options.basedir, request);
  } catch (error) {
    // Fallback to default resolution
    return options.defaultResolver(request, options);
  }
};