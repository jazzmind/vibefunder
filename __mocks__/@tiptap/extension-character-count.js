// Mock CharacterCount extension
const mockCharacterCountExtension = {
  configure: jest.fn((options) => mockCharacterCountExtension),
  extend: jest.fn(() => mockCharacterCountExtension),
  name: 'characterCount'
};

export default mockCharacterCountExtension;