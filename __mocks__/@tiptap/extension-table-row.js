// Mock TableRow extension
export const TableRow = {
  configure: jest.fn((options) => TableRow),
  extend: jest.fn(() => TableRow),
  name: 'tableRow'
};