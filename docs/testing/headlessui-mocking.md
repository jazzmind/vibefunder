# HeadlessUI Component Mocking Guide

This document explains how to properly mock HeadlessUI components for testing in the VibeFunder project.

## Overview

HeadlessUI components like `Dialog` and `Transition` require special mocking for Jest tests because they use complex internal state management and DOM manipulation that doesn't work well in test environments.

## Mock Structure

### Location
All HeadlessUI mocks are centrally located in:
```
__mocks__/@headlessui/react.js
```

### Supported Components

The mock file provides test implementations for:

- **Dialog** - Modal dialogs and overlays
- **Dialog.Panel** - The main dialog content area
- **Dialog.Title** - Dialog title component
- **Transition** - Visibility transitions
- **Transition.Child** - Nested transition components
- **Fragment** - React Fragment wrapper

### Additional Components (Ready for Future Use)

The mock also includes implementations for other HeadlessUI components that might be used in the future:

- **Disclosure** - Collapsible content
- **Menu** - Dropdown menus
- **Listbox** - Select dropdowns
- **Switch** - Toggle switches
- **Tab** - Tab navigation

## Usage

### For React Components that Use HeadlessUI

1. **Add jsdom environment directive** to your test file:
```javascript
/**
 * @jest-environment jsdom
 */
import React from 'react';
// ... rest of imports
```

2. **The mocks are automatically applied** - no manual mocking needed in test files.

3. **Test as normal**:
```javascript
import { render, screen } from '@testing-library/react';
import MyModal from '@/components/MyModal';

test('should render modal when open', () => {
  render(<MyModal isOpen={true} title="Test" />);
  expect(screen.getByRole('dialog')).toBeInTheDocument();
});
```

### Key Mock Behaviors

1. **Dialog Component**:
   - Renders content when `show` prop is true (via parent Transition)
   - Provides `role="presentation"` for the container
   - Supports `onClose` callback for backdrop clicks

2. **Dialog.Panel**:
   - Renders with `role="dialog"` for accessibility
   - Passes through all props including `className`

3. **Dialog.Title**:
   - Renders as `h3` by default (can be overridden with `as` prop)
   - Maintains semantic heading structure

4. **Transition**:
   - Shows/hides content based on `show` prop
   - Supports `as={Fragment}` for React Fragment rendering
   - Handles nested `Transition.Child` components

## Example: Modal Component Testing

```javascript
/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import Modal from '@/components/shared/Modal';

describe('Modal Component', () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    title: 'Test Modal',
    children: <div>Modal content</div>,
  };

  it('should render when isOpen is true', () => {
    render(<Modal {...defaultProps} />);
    
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Test Modal')).toBeInTheDocument();
    expect(screen.getByText('Modal content')).toBeInTheDocument();
  });

  it('should not render when isOpen is false', () => {
    render(<Modal {...defaultProps} isOpen={false} />);
    
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('should call onClose when close button clicked', () => {
    const mockOnClose = jest.fn();
    render(<Modal {...defaultProps} onClose={mockOnClose} />);
    
    fireEvent.click(screen.getByRole('button'));
    expect(mockOnClose).toHaveBeenCalled();
  });
});
```

## Environment Configuration

### Jest Environment Directive

For React component tests that use HeadlessUI, add this directive at the top of your test file:

```javascript
/**
 * @jest-environment jsdom
 */
```

This ensures the test runs in a browser-like environment instead of the default Node.js environment.

### Global Jest Configuration

The main `jest.config.js` keeps the default `testEnvironment: 'node'` to maintain compatibility with database and API tests. Individual component tests opt into jsdom using the file-level directive.

## Mock Implementation Details

### Dialog Mock
```javascript
export const Dialog = ({ children, onClose, className, ...props }) => {
  return (
    <div 
      role="presentation" 
      className={className} 
      onClick={(e) => {
        // Simulate backdrop click behavior
        if (e.target === e.currentTarget && onClose) {
          onClose();
        }
      }}
      {...props}
    >
      {children}
    </div>
  );
};
```

### Transition Mock
```javascript
export const Transition = ({ show, children, as: Component, appear, ...props }) => {
  // If show is false, don't render anything
  if (!show) return null;
  
  // If as prop is Fragment, render children directly
  if (Component === React.Fragment || !Component) {
    return <>{children}</>;
  }
  
  // Otherwise render with the specified component
  return <Component {...props}>{children}</Component>;
};
```

## Benefits

1. **Simplified Testing** - No need for complex manual mocks in each test file
2. **Consistent Behavior** - All HeadlessUI components behave predictably in tests
3. **Accessibility Testing** - Proper roles and semantics are maintained
4. **Performance** - Fast test execution without complex DOM manipulation
5. **Maintainability** - Centralized mock management

## Troubleshooting

### Common Issues

1. **Test fails with "document is not defined"**:
   - Add `@jest-environment jsdom` directive to test file

2. **Dialog not found**:
   - Check that the `show` prop is properly passed to Transition
   - Verify that `isOpen` prop is true in your test

3. **Event handlers not working**:
   - Ensure you're testing the correct element (button vs dialog panel)
   - Use `fireEvent` from `@testing-library/react`

### Debug Tips

1. Use `screen.debug()` to see the rendered DOM structure
2. Check `data-testid` attributes for specific element targeting
3. Verify component props are being passed correctly

## Future Enhancements

- Add support for animation testing if needed
- Extend mocks for additional HeadlessUI components as they're adopted
- Add custom accessibility matchers for more comprehensive testing

---

This mocking strategy ensures reliable, fast, and maintainable testing of HeadlessUI components across the VibeFunder codebase.