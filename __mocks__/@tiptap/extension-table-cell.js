// Mock TableCell extension
export const TableCell = {
  configure: jest.fn((options) => TableCell),
  extend: jest.fn(() => TableCell),
  name: 'tableCell'
};