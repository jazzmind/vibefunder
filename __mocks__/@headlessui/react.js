// HeadlessUI React mocks for testing
import React from 'react';

// Dialog mock - the main component that wraps modal content
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

// Dialog Panel - the actual modal dialog content
Dialog.Panel = ({ children, className, ...props }) => (
  <div role="dialog" className={className} {...props}>
    {children}
  </div>
);

// Dialog Title - the modal title 
Dialog.Title = ({ children, className, as: Component = 'h3', ...props }) => (
  <Component className={className} {...props}>
    {children}
  </Component>
);

// Transition - controls visibility based on show prop
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

// Transition Child - nested transition component
Transition.Child = ({ show, children, as: Component, enter, enterFrom, enterTo, leave, leaveFrom, leaveTo, ...props }) => {
  // For Transition.Child inside a Transition, we inherit the show state from parent
  // In real HeadlessUI, this would be automatically handled
  // For testing, we just render the children if parent Transition is shown
  
  if (Component === React.Fragment || !Component) {
    return <>{children}</>;
  }
  
  return <Component {...props}>{children}</Component>;
};

// Fragment export for compatibility
export const Fragment = React.Fragment;

// Export everything as default for backwards compatibility
export default {
  Dialog,
  Transition,
  Fragment,
};