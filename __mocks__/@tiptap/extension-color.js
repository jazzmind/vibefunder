// Mock Color extension
const mockColorExtension = {
  configure: jest.fn((options) => mockColorExtension),
  extend: jest.fn(() => mockColorExtension),
  name: 'color'
};

export default mockColorExtension;