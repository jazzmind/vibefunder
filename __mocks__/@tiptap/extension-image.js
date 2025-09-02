// Mock Image extension
const mockImageExtension = {
  configure: jest.fn((options) => mockImageExtension),
  extend: jest.fn(() => mockImageExtension),
  name: 'image'
};

export default mockImageExtension;