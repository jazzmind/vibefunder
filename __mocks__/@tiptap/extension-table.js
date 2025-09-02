// Mock Table extensions
export const Table = {
  configure: jest.fn((options) => Table),
  extend: jest.fn(() => Table),
  name: 'table'
};