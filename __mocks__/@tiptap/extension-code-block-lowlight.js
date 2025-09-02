// Mock CodeBlockLowlight extension
const mockCodeBlockLowlightExtension = {
  configure: jest.fn((options) => mockCodeBlockLowlightExtension),
  extend: jest.fn(() => mockCodeBlockLowlightExtension),
  name: 'codeBlockLowlight'
};

export default mockCodeBlockLowlightExtension;