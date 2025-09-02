// Mock Placeholder extension
const mockPlaceholderExtension = {
  configure: jest.fn((options) => mockPlaceholderExtension),
  extend: jest.fn(() => mockPlaceholderExtension),
  name: 'placeholder'
};

export default mockPlaceholderExtension;