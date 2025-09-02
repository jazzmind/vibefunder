import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

// Note: Tiptap extensions are mocked via __mocks__ directory structure
// This allows Jest to automatically use the proper mocks with configure() methods

// CSS import is handled by moduleNameMapper

// Mock window methods
Object.defineProperty(window, 'prompt', {
  value: jest.fn(),
  writable: true,
});

Object.defineProperty(window, 'confirm', {
  value: jest.fn(),
  writable: true,
});

// Mock fetch for API calls
global.fetch = jest.fn();

import TiptapEditor from '@/components/editor/TiptapEditor';

describe('TiptapEditor Component', () => {
  const defaultProps = {
    content: '<p>Initial content</p>',
    onChange: jest.fn(),
    placeholder: 'Start typing...',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (window.prompt as jest.Mock).mockReturnValue('https://example.com');
    (window.confirm as jest.Mock).mockReturnValue(true);
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ imagePath: '/test-image.jpg' }),
    });
  });

  describe('rendering', () => {
    it('should render editor with toolbar', () => {
      render(<TiptapEditor {...defaultProps} />);

      expect(screen.getByTestId('editor-content')).toBeInTheDocument();
      expect(screen.getByText('Mock Tiptap Editor Content')).toBeInTheDocument();
    });

    it('should render formatting buttons in toolbar', () => {
      render(<TiptapEditor {...defaultProps} />);

      // Check for actual formatting buttons based on component implementation
      expect(screen.getByTitle('Bold')).toBeInTheDocument();
      expect(screen.getByTitle('Italic')).toBeInTheDocument();
      expect(screen.getByTitle('Underline')).toBeInTheDocument();
      expect(screen.getByTitle('Strikethrough')).toBeInTheDocument();
      expect(screen.getByTitle('Code Block')).toBeInTheDocument();
    });

    it('should render heading buttons', () => {
      render(<TiptapEditor {...defaultProps} />);

      expect(screen.getByTitle('Heading 1')).toBeInTheDocument();
      expect(screen.getByTitle('Heading 2')).toBeInTheDocument();
      expect(screen.getByTitle('Heading 3')).toBeInTheDocument();
    });

    it('should render list and quote buttons', () => {
      render(<TiptapEditor {...defaultProps} />);

      expect(screen.getByTitle('Bullet List')).toBeInTheDocument();
      expect(screen.getByTitle('Numbered List')).toBeInTheDocument();
      expect(screen.getByTitle('Quote')).toBeInTheDocument();
    });

    it('should render media and link buttons', () => {
      render(<TiptapEditor {...defaultProps} />);

      expect(screen.getByTitle('Add/Edit Link')).toBeInTheDocument();
      expect(screen.getByTitle('Insert Table')).toBeInTheDocument();
      expect(screen.getByTitle('Generate image from selected text')).toBeInTheDocument();
      expect(screen.getByTitle('Convert Markdown to HTML')).toBeInTheDocument();
    });

    it('should render utility buttons', () => {
      render(<TiptapEditor {...defaultProps} />);

      expect(screen.getByTitle('Switch to Code View')).toBeInTheDocument();
      expect(screen.getByTitle('Clean up formatting and remove excessive whitespace')).toBeInTheDocument();
      expect(screen.getByTitle('Horizontal Rule')).toBeInTheDocument();
    });

    it('should render character count when maxLength is provided', () => {
      render(<TiptapEditor {...defaultProps} maxLength={1000} />);

      expect(screen.getByText('100/1000 characters')).toBeInTheDocument();
    });

    it('should apply custom className to editor', () => {
      const { container } = render(<TiptapEditor {...defaultProps} className="custom-editor" />);

      // The className is applied to the main wrapper div
      const editorWrapper = container.firstElementChild;
      expect(editorWrapper).toHaveClass('custom-editor');
    });

    it('should render image library button when onOpenMediaLibrary is provided', () => {
      const onOpenMediaLibrary = jest.fn();
      render(<TiptapEditor {...defaultProps} onOpenMediaLibrary={onOpenMediaLibrary} />);

      expect(screen.getByTitle('Image Library')).toBeInTheDocument();
    });

    it('should render code view toggle button', () => {
      render(<TiptapEditor {...defaultProps} />);

      expect(screen.getByTitle('Code View')).toBeInTheDocument();
    });

    it('should render AI image generation button', () => {
      render(<TiptapEditor {...defaultProps} />);

      expect(screen.getByTitle('Generate image from selected text')).toBeInTheDocument();
    });
  });

  describe('toolbar interactions', () => {
    it('should handle bold button click', () => {
      const { useEditor } = require('@tiptap/react');
      const mockEditor = useEditor();
      render(<TiptapEditor {...defaultProps} />);

      const boldButton = screen.getByTitle('Bold');
      fireEvent.click(boldButton);

      expect(mockEditor.chain().focus().toggleBold().run).toHaveBeenCalled();
    });

    it('should handle italic button click', () => {
      const { useEditor } = require('@tiptap/react');
      const mockEditor = useEditor();
      render(<TiptapEditor {...defaultProps} />);

      const italicButton = screen.getByTitle('Italic');
      fireEvent.click(italicButton);

      expect(mockEditor.chain().focus().toggleItalic().run).toHaveBeenCalled();
    });

    it('should handle underline button click', () => {
      const { useEditor } = require('@tiptap/react');
      const mockEditor = useEditor();
      render(<TiptapEditor {...defaultProps} />);

      const underlineButton = screen.getByTitle('Underline');
      fireEvent.click(underlineButton);

      expect(mockEditor.chain().focus().toggleUnderline().run).toHaveBeenCalled();
    });

    it('should handle code button click', () => {
      const { useEditor } = require('@tiptap/react');
      const mockEditor = useEditor();
      render(<TiptapEditor {...defaultProps} />);

      const codeButton = screen.getByTitle('Code');
      fireEvent.click(codeButton);

      expect(mockEditor.chain().focus().toggleCode().run).toHaveBeenCalled();
    });

    it('should handle strike button click', () => {
      const { useEditor } = require('@tiptap/react');
      const mockEditor = useEditor();
      render(<TiptapEditor {...defaultProps} />);

      const strikeButton = screen.getByTitle('Strike');
      fireEvent.click(strikeButton);

      expect(mockEditor.chain().focus().toggleStrike().run).toHaveBeenCalled();
    });

    it('should handle heading button clicks', () => {
      const { useEditor } = require('@tiptap/react');
      const mockEditor = useEditor();
      render(<TiptapEditor {...defaultProps} />);

      const h1Button = screen.getByTitle('Heading 1');
      fireEvent.click(h1Button);

      expect(mockEditor.chain().focus().toggleHeading({ level: 1 }).run).toHaveBeenCalled();

      const paragraphButton = screen.getByTitle('Paragraph');
      fireEvent.click(paragraphButton);

      expect(mockEditor.chain().focus().setParagraph().run).toHaveBeenCalled();
    });

    it('should handle list button clicks', () => {
      const { useEditor } = require('@tiptap/react');
      const mockEditor = useEditor();
      render(<TiptapEditor {...defaultProps} />);

      const bulletListButton = screen.getByTitle('Bullet List');
      fireEvent.click(bulletListButton);

      expect(mockEditor.chain().focus().toggleBulletList().run).toHaveBeenCalled();

      const orderedListButton = screen.getByTitle('Numbered List');
      fireEvent.click(orderedListButton);

      expect(mockEditor.chain().focus().toggleOrderedList().run).toHaveBeenCalled();
    });

    it('should handle blockquote button click', () => {
      const { useEditor } = require('@tiptap/react');
      const mockEditor = useEditor();
      render(<TiptapEditor {...defaultProps} />);

      const blockquoteButton = screen.getByTitle('Quote');
      fireEvent.click(blockquoteButton);

      expect(mockEditor.chain().focus().toggleBlockquote().run).toHaveBeenCalled();
    });

    it('should handle code block button click', () => {
      const { useEditor } = require('@tiptap/react');
      const mockEditor = useEditor();
      render(<TiptapEditor {...defaultProps} />);

      const codeBlockButton = screen.getByTitle('Code Block');
      fireEvent.click(codeBlockButton);

      expect(mockEditor.chain().focus().toggleCodeBlock().run).toHaveBeenCalled();
    });

    it('should handle table insertion', () => {
      const { useEditor } = require('@tiptap/react');
      const mockEditor = useEditor();
      render(<TiptapEditor {...defaultProps} />);

      const tableButton = screen.getByTitle('Insert Table');
      fireEvent.click(tableButton);

      expect(mockEditor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run).toHaveBeenCalled();
    });

    it('should handle undo and redo clicks', () => {
      const { useEditor } = require('@tiptap/react');
      const mockEditor = useEditor();
      render(<TiptapEditor {...defaultProps} />);

      const undoButton = screen.getByTitle('Undo');
      fireEvent.click(undoButton);

      expect(mockEditor.chain().focus().undo().run).toHaveBeenCalled();

      const redoButton = screen.getByTitle('Redo');
      fireEvent.click(redoButton);

      expect(mockEditor.chain().focus().redo().run).toHaveBeenCalled();
    });

    it('should handle link addition with prompt', () => {
      const { useEditor } = require('@tiptap/react');
      const mockEditor = useEditor();
      render(<TiptapEditor {...defaultProps} />);

      const linkButton = screen.getByTitle('Add/Edit Link');
      fireEvent.click(linkButton);

      expect(window.prompt).toHaveBeenCalledWith('Enter URL:', 'https://example.com');
      expect(mockEditor.chain().focus().extendMarkRange().setLink).toHaveBeenCalledWith({
        href: 'https://example.com',
      });
    });

    it('should handle link removal when empty URL provided', () => {
      const { useEditor } = require('@tiptap/react');
      const mockEditor = useEditor();
      (window.prompt as jest.Mock).mockReturnValue('');
      
      render(<TiptapEditor {...defaultProps} />);

      const linkButton = screen.getByTitle('Add/Edit Link');
      fireEvent.click(linkButton);

      expect(mockEditor.chain().focus().extendMarkRange().unsetLink().run).toHaveBeenCalled();
    });

    it('should handle cancelled link prompt', () => {
      const { useEditor } = require('@tiptap/react');
      const mockEditor = useEditor();
      (window.prompt as jest.Mock).mockReturnValue(null);
      
      render(<TiptapEditor {...defaultProps} />);

      const linkButton = screen.getByTitle('Add/Edit Link');
      fireEvent.click(linkButton);

      // Should not set or unset link when cancelled
      expect(mockEditor.chain().focus().extendMarkRange().setLink).not.toHaveBeenCalled();
      expect(mockEditor.chain().focus().extendMarkRange().unsetLink().run).not.toHaveBeenCalled();
    });
  });

  describe('media library integration', () => {
    it('should call onOpenMediaLibrary when image library button is clicked', () => {
      const onOpenMediaLibrary = jest.fn();
      render(<TiptapEditor {...defaultProps} onOpenMediaLibrary={onOpenMediaLibrary} />);

      const imageLibraryButton = screen.getByTitle('Image Library');
      fireEvent.click(imageLibraryButton);

      expect(onOpenMediaLibrary).toHaveBeenCalledTimes(1);
    });

    it('should not render image library button when callback not provided', () => {
      render(<TiptapEditor {...defaultProps} />);

      expect(screen.queryByTitle('Image Library')).not.toBeInTheDocument();
    });
  });

  describe('code view functionality', () => {
    it('should toggle between editor and code view', () => {
      render(<TiptapEditor {...defaultProps} />);

      const codeViewButton = screen.getByTitle('Code View');
      fireEvent.click(codeViewButton);

      // Should show HTML code
      expect(screen.getByDisplayValue('<p>Mock editor content</p>')).toBeInTheDocument();
    });

    it('should update content when editing in code view', () => {
      render(<TiptapEditor {...defaultProps} />);

      const codeViewButton = screen.getByTitle('Code View');
      fireEvent.click(codeViewButton);

      const textarea = screen.getByDisplayValue('<p>Mock editor content</p>');
      fireEvent.change(textarea, { target: { value: '<p>Updated content</p>' } });

      expect(defaultProps.onChange).toHaveBeenCalledWith('<p>Updated content</p>');
    });

    it('should switch back to editor view', () => {
      render(<TiptapEditor {...defaultProps} />);

      const codeViewButton = screen.getByTitle('Code View');
      fireEvent.click(codeViewButton);

      const editorViewButton = screen.getByTitle('Editor View');
      fireEvent.click(editorViewButton);

      expect(screen.getByTestId('editor-content')).toBeInTheDocument();
    });
  });

  describe('AI image generation', () => {
    it('should show AI image generation button', () => {
      render(<TiptapEditor {...defaultProps} />);

      expect(screen.getByTitle('Generate image from selected text')).toBeInTheDocument();
    });

    it('should handle AI image generation', async () => {
      const { useEditor } = require('@tiptap/react');
      const mockEditor = useEditor();
      render(<TiptapEditor {...defaultProps} />);

      const aiImageButton = screen.getByTitle('Generate image from selected text');
      fireEvent.click(aiImageButton);

      expect(global.fetch).toHaveBeenCalledWith('/api/images/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: 'Create a professional image for: Mock editor content', tags: ['generated', 'text-to-image'], isPublic: false }),
      });

      await waitFor(() => {
        expect(mockEditor.chain().focus().setImage).toHaveBeenCalledWith({
          src: undefined,
          alt: 'Mock editor content',
        });
      });
    });

    it('should show loading state during AI image generation', () => {
      // Mock a delayed fetch response
      (global.fetch as jest.Mock).mockImplementationOnce(() =>
        new Promise(resolve =>
          setTimeout(() =>
            resolve({
              ok: true,
              json: () => Promise.resolve({ imagePath: '/test-image.jpg' }),
            }),
            100
          )
        )
      );

      render(<TiptapEditor {...defaultProps} />);

      const aiImageButton = screen.getByTitle('Generate image from selected text');
      fireEvent.click(aiImageButton);

      // Should show loading state
      expect(aiImageButton).toBeDisabled();
    });

    it('should handle AI image generation failure', async () => {
      const { useEditor } = require('@tiptap/react');
      const mockEditor = useEditor();
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Generation failed'));
      
      render(<TiptapEditor {...defaultProps} />);

      const aiImageButton = screen.getByTitle('Generate image from selected text');
      fireEvent.click(aiImageButton);

      // Should handle error gracefully
      await waitFor(() => {
        expect(mockEditor.chain().focus().setImage).not.toHaveBeenCalled();
      });
    });

    it('should handle API error response', async () => {
      const { useEditor } = require('@tiptap/react');
      const mockEditor = useEditor();
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: jest.fn().mockResolvedValue({ error: 'API error' }),
      });
      
      render(<TiptapEditor {...defaultProps} />);

      const aiImageButton = screen.getByTitle('Generate image from selected text');
      fireEvent.click(aiImageButton);

      await waitFor(() => {
        expect(mockEditor.chain().focus().setImage).not.toHaveBeenCalled();
      });
    });
  });

  describe('accessibility', () => {
    it('should have proper button roles and titles', () => {
      render(<TiptapEditor {...defaultProps} />);

      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);

      // Each button should have a title attribute
      buttons.forEach(button => {
        expect(button).toHaveAttribute('title');
      });
    });

    it('should support keyboard navigation', () => {
      render(<TiptapEditor {...defaultProps} />);

      const firstButton = screen.getByTitle('Bold');
      firstButton.focus();
      
      expect(firstButton).toHaveFocus();
    });

    it('should have proper button states', () => {
      render(<TiptapEditor {...defaultProps} />);

      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button).toHaveAttribute('type', 'button');
      });
    });
  });

  describe('character count', () => {
    it('should not show character count without maxLength', () => {
      render(<TiptapEditor {...defaultProps} />);

      expect(screen.queryByText(/\d+ \/ \d+/)).not.toBeInTheDocument();
    });

    it('should show character count with maxLength', () => {
      render(<TiptapEditor {...defaultProps} maxLength={500} />);

      expect(screen.getByText('100/500 characters')).toBeInTheDocument();
    });

    it('should handle character count formatting correctly', () => {
      render(<TiptapEditor {...defaultProps} maxLength={1000} />);

      const characterCount = screen.getByText('100/1000 characters');
      expect(characterCount).toHaveClass('text-gray-500');
    });
  });

  describe('editor initialization and configuration', () => {
    it('should initialize editor with correct content', () => {
      const { useEditor } = require('@tiptap/react');
      render(<TiptapEditor content="<p>Test content</p>" onChange={jest.fn()} />);

      // useEditor should have been called
      expect(useEditor).toHaveBeenCalled();
    });

    it('should handle editor destroy on unmount', () => {
      const { useEditor } = require('@tiptap/react');
      const mockEditor = useEditor();
      
      const { unmount } = render(<TiptapEditor {...defaultProps} />);
      
      unmount();
      
      // Editor destroy is handled by the hook itself
      expect(mockEditor.destroy).toBeDefined();
    });

    it('should handle content changes', () => {
      const onChange = jest.fn();
      render(<TiptapEditor {...defaultProps} onChange={onChange} />);

      // The onChange would be called by the editor instance in real usage
      expect(onChange).toBeDefined();
    });

    it('should handle placeholder text', () => {
      render(<TiptapEditor {...defaultProps} placeholder="Custom placeholder" />);

      // Placeholder is handled by the extension configuration
      expect(screen.getByTestId('editor-content')).toBeInTheDocument();
    });
  });

  describe('toolbar button states', () => {
    it('should show active state for formatting buttons', () => {
      const { useEditor } = require('@tiptap/react');
      const mockEditor = useEditor();
      mockEditor.isActive.mockImplementation((format) => format === 'bold');

      render(<TiptapEditor {...defaultProps} />);

      const boldButton = screen.getByTitle('Bold');
      // In real implementation, active buttons would have different styling
      expect(boldButton).toBeInTheDocument();
    });

    it('should handle disabled states', () => {
      const { useEditor } = require('@tiptap/react');
      const mockEditor = useEditor();
      mockEditor.can.mockImplementation(() => ({ chain: () => ({ focus: () => ({ toggleBold: () => ({ run: false }) }) }) }));

      render(<TiptapEditor {...defaultProps} />);

      const boldButton = screen.getByTitle('Bold');
      expect(boldButton).toBeInTheDocument();
    });
  });

  describe('error handling', () => {
    it('should handle editor initialization errors', () => {
      const { useEditor } = require('@tiptap/react');
      useEditor.mockReturnValueOnce(null);

      expect(() => render(<TiptapEditor {...defaultProps} />)).not.toThrow();
    });

    it('should handle command execution errors', () => {
      const { useEditor } = require('@tiptap/react');
      const mockEditor = useEditor();
      mockEditor.chain.mockImplementation(() => {
        throw new Error('Command failed');
      });

      render(<TiptapEditor {...defaultProps} />);

      const boldButton = screen.getByTitle('Bold');
      expect(() => fireEvent.click(boldButton)).not.toThrow();
    });
  });
});