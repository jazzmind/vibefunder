// Mock TableHeader extension
export const TableHeader = {
  configure: jest.fn((options) => TableHeader),
  extend: jest.fn(() => TableHeader),
  name: 'tableHeader'
};