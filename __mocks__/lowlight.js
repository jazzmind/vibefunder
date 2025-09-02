// Mock lowlight library
export const common = {};

export const createLowlight = jest.fn(() => ({
  register: jest.fn(),
  highlight: jest.fn(() => ({
    value: 'highlighted code'
  }))
}));