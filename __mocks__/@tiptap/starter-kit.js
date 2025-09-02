// Mock StarterKit extension
const mockExtension = {
  configure: jest.fn((options) => mockExtension),
  extend: jest.fn(() => mockExtension),
  name: "starterKit"
};

export default mockExtension;
