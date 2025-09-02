// Mock Link extension
const mockLinkExtension = {
  configure: jest.fn((options) => mockLinkExtension),
  extend: jest.fn(() => mockLinkExtension),
  name: "link"
};

export default mockLinkExtension;
