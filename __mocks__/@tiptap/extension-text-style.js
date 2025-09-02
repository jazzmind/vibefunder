// Mock TextStyle extension
export const TextStyle = {
  configure: jest.fn((options) => TextStyle),
  extend: jest.fn(() => TextStyle),
  name: 'textStyle'
};