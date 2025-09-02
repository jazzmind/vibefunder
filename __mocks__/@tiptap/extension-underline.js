// Mock Underline extension
const mockUnderlineExtension = {
  configure: jest.fn((options) => mockUnderlineExtension),
  extend: jest.fn(() => mockUnderlineExtension),
  name: 'underline'
};

export default mockUnderlineExtension;