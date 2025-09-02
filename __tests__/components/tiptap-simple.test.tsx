// Simple TiptapEditor test to isolate the issue
import React from 'react';
import { render, screen } from '@testing-library/react';
import TiptapEditor from '@/components/editor/TiptapEditor';

// CSS import is handled by moduleNameMapper

describe('TiptapEditor Simple Test', () => {
  const defaultProps = {
    content: '<p>Initial content</p>',
    onChange: jest.fn(),
    placeholder: 'Type something...'
  };

  it('should render without crashing', () => {
    console.log('About to render TiptapEditor...');
    
    expect(() => {
      render(<TiptapEditor {...defaultProps} />);
    }).not.toThrow();
    
    console.log('TiptapEditor rendered successfully');
  });
  
  it('should render editor content element', () => {
    render(<TiptapEditor {...defaultProps} />);
    
    const editorContent = screen.getByTestId('editor-content');
    expect(editorContent).toBeInTheDocument();
  });
});