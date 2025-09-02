import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock Tiptap dependencies
jest.mock('@tiptap/react', () => ({
  useEditor: jest.fn(() => ({
    getHTML: jest.fn(() => '<p>Mock content</p>'),
    isEmpty: false,
    isDestroyed: false,
    state: { doc: { content: { size: 100 } } },
    isActive: jest.fn(() => false),
    can: jest.fn(() => ({ chain: jest.fn(() => ({ focus: jest.fn(() => ({ toggleBold: jest.fn(() => ({ run: jest.fn() })) })) })) })),
    chain: jest.fn(() => ({
      focus: jest.fn(() => ({
        toggleBold: jest.fn(() => ({ run: jest.fn() })),
        toggleItalic: jest.fn(() => ({ run: jest.fn() })),
        toggleUnderline: jest.fn(() => ({ run: jest.fn() })),
        toggleCode: jest.fn(() => ({ run: jest.fn() })),
        toggleStrike: jest.fn(() => ({ run: jest.fn() })),
        setParagraph: jest.fn(() => ({ run: jest.fn() })),
        toggleHeading: jest.fn(() => ({ run: jest.fn() })),
        toggleBulletList: jest.fn(() => ({ run: jest.fn() })),
        toggleOrderedList: jest.fn(() => ({ run: jest.fn() })),
        toggleBlockquote: jest.fn(() => ({ run: jest.fn() })),
        toggleCodeBlock: jest.fn(() => ({ run: jest.fn() })),
        insertTable: jest.fn(() => ({ run: jest.fn() })),
        unsetLink: jest.fn(() => ({ run: jest.fn() })),
        setLink: jest.fn(() => ({ run: jest.fn() })),
        extendMarkRange: jest.fn(() => ({ unsetLink: jest.fn(() => ({ run: jest.fn() })) })),
        setImage: jest.fn(() => ({ run: jest.fn() })),
        undo: jest.fn(() => ({ run: jest.fn() })),
        redo: jest.fn(() => ({ run: jest.fn() })),
      }))
    })),
    getAttributes: jest.fn(() => ({ href: 'https://example.com' })),
    storage: { characterCount: { characters: jest.fn(() => 100) } },
    on: jest.fn(),
    off: jest.fn(),
    destroy: jest.fn(),
  })),
  EditorContent: ({ editor, className }: any) => (
    <div className={className} data-testid="editor-content">
      Mock Editor Content
    </div>
  ),
}));

// Mock CSS import
jest.mock('@/components/editor/tiptap.css', () => ({}));

// Mock Tiptap extensions
jest.mock('@tiptap/starter-kit', () => ({ default: {} }));
jest.mock('@tiptap/extension-link', () => ({ default: {} }));
jest.mock('@tiptap/extension-image', () => ({ default: {} }));
jest.mock('@tiptap/extension-placeholder', () => ({ default: {} }));
jest.mock('@tiptap/extension-character-count', () => ({ default: {} }));
jest.mock('@tiptap/extension-code-block-lowlight', () => ({ default: {} }));
jest.mock('@tiptap/extension-table', () => ({ Table: {} }));
jest.mock('@tiptap/extension-table-row', () => ({ TableRow: {} }));
jest.mock('@tiptap/extension-table-cell', () => ({ TableCell: {} }));
jest.mock('@tiptap/extension-table-header', () => ({ TableHeader: {} }));
jest.mock('@tiptap/extension-text-style', () => ({ TextStyle: {} }));
jest.mock('@tiptap/extension-color', () => ({ default: {} }));
jest.mock('@tiptap/extension-underline', () => ({ default: {} }));

// Mock lowlight
jest.mock('lowlight', () => ({
  common: {},
  createLowlight: jest.fn(() => ({
    register: jest.fn(),
  })),
}));

// Mock highlight.js languages
jest.mock('highlight.js/lib/languages/javascript', () => ({}));
jest.mock('highlight.js/lib/languages/typescript', () => ({}));
jest.mock('highlight.js/lib/languages/python', () => ({}));
jest.mock('highlight.js/lib/languages/css', () => ({}));
jest.mock('highlight.js/lib/languages/xml', () => ({}));

// Mock window.prompt
Object.defineProperty(window, 'prompt', {
  value: jest.fn(),
  writable: true,
});

// Mock window.confirm
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
      expect(screen.getByText('Mock Editor Content')).toBeInTheDocument();
    });

    it('should render formatting buttons in toolbar', () => {
      render(<TiptapEditor {...defaultProps} />);

      // Check for common formatting buttons
      expect(screen.getByTitle('Bold')).toBeInTheDocument();
      expect(screen.getByTitle('Italic')).toBeInTheDocument();
      expect(screen.getByTitle('Underline')).toBeInTheDocument();
      expect(screen.getByTitle('Code')).toBeInTheDocument();
      expect(screen.getByTitle('Strike')).toBeInTheDocument();
    });

    it('should render heading buttons', () => {
      render(<TiptapEditor {...defaultProps} />);

      expect(screen.getByTitle('Paragraph')).toBeInTheDocument();
      expect(screen.getByTitle('Heading 1')).toBeInTheDocument();
      expect(screen.getByTitle('Heading 2')).toBeInTheDocument();
      expect(screen.getByTitle('Heading 3')).toBeInTheDocument();
    });

    it('should render list and quote buttons', () => {
      render(<TiptapEditor {...defaultProps} />);

      expect(screen.getByTitle('Bullet List')).toBeInTheDocument();
      expect(screen.getByTitle('Ordered List')).toBeInTheDocument();
      expect(screen.getByTitle('Blockquote')).toBeInTheDocument();
    });

    it('should render media and link buttons', () => {
      render(<TiptapEditor {...defaultProps} />);

      expect(screen.getByTitle('Add Link')).toBeInTheDocument();
      expect(screen.getByTitle('Code Block')).toBeInTheDocument();
      expect(screen.getByTitle('Insert Table')).toBeInTheDocument();
    });

    it('should render undo/redo buttons', () => {
      render(<TiptapEditor {...defaultProps} />);

      expect(screen.getByTitle('Undo')).toBeInTheDocument();
      expect(screen.getByTitle('Redo')).toBeInTheDocument();
    });

    it('should render character count when maxLength is provided', () => {
      render(<TiptapEditor {...defaultProps} maxLength={1000} />);

      expect(screen.getByText('100 / 1000')).toBeInTheDocument();
    });

    it('should apply custom className to editor', () => {
      render(<TiptapEditor {...defaultProps} className="custom-editor" />);

      const editorContent = screen.getByTestId('editor-content');
      expect(editorContent).toHaveClass('custom-editor');
    });

    it('should render image library button when onOpenMediaLibrary is provided', () => {
      const onOpenMediaLibrary = jest.fn();
      render(<TiptapEditor {...defaultProps} onOpenMediaLibrary={onOpenMediaLibrary} />);

      expect(screen.getByTitle('Image Library')).toBeInTheDocument();
    });
  });

  describe('toolbar interactions', () => {
    it('should handle bold button click', () => {
      const mockEditor = require('@tiptap/react').useEditor();
      render(<TiptapEditor {...defaultProps} />);

      const boldButton = screen.getByTitle('Bold');
      fireEvent.click(boldButton);

      expect(mockEditor.chain().focus().toggleBold().run).toHaveBeenCalled();
    });

    it('should handle italic button click', () => {
      const mockEditor = require('@tiptap/react').useEditor();
      render(<TiptapEditor {...defaultProps} />);

      const italicButton = screen.getByTitle('Italic');
      fireEvent.click(italicButton);

      expect(mockEditor.chain().focus().toggleItalic().run).toHaveBeenCalled();
    });

    it('should handle underline button click', () => {
      const mockEditor = require('@tiptap/react').useEditor();
      render(<TiptapEditor {...defaultProps} />);

      const underlineButton = screen.getByTitle('Underline');
      fireEvent.click(underlineButton);

      expect(mockEditor.chain().focus().toggleUnderline().run).toHaveBeenCalled();
    });

    it('should handle heading button clicks', () => {
      const mockEditor = require('@tiptap/react').useEditor();
      render(<TiptapEditor {...defaultProps} />);

      const h1Button = screen.getByTitle('Heading 1');
      fireEvent.click(h1Button);

      expect(mockEditor.chain().focus().toggleHeading).toHaveBeenCalledWith({ level: 1 });

      const paragraphButton = screen.getByTitle('Paragraph');
      fireEvent.click(paragraphButton);

      expect(mockEditor.chain().focus().setParagraph().run).toHaveBeenCalled();
    });

    it('should handle list button clicks', () => {
      const mockEditor = require('@tiptap/react').useEditor();
      render(<TiptapEditor {...defaultProps} />);

      const bulletListButton = screen.getByTitle('Bullet List');
      fireEvent.click(bulletListButton);

      expect(mockEditor.chain().focus().toggleBulletList().run).toHaveBeenCalled();

      const orderedListButton = screen.getByTitle('Ordered List');
      fireEvent.click(orderedListButton);

      expect(mockEditor.chain().focus().toggleOrderedList().run).toHaveBeenCalled();
    });

    it('should handle blockquote button click', () => {
      const mockEditor = require('@tiptap/react').useEditor();
      render(<TiptapEditor {...defaultProps} />);

      const blockquoteButton = screen.getByTitle('Blockquote');
      fireEvent.click(blockquoteButton);

      expect(mockEditor.chain().focus().toggleBlockquote().run).toHaveBeenCalled();
    });

    it('should handle code block button click', () => {
      const mockEditor = require('@tiptap/react').useEditor();
      render(<TiptapEditor {...defaultProps} />);

      const codeBlockButton = screen.getByTitle('Code Block');
      fireEvent.click(codeBlockButton);

      expect(mockEditor.chain().focus().toggleCodeBlock().run).toHaveBeenCalled();
    });

    it('should handle table insertion', () => {
      const mockEditor = require('@tiptap/react').useEditor();
      render(<TiptapEditor {...defaultProps} />);

      const tableButton = screen.getByTitle('Insert Table');
      fireEvent.click(tableButton);

      expect(mockEditor.chain().focus().insertTable).toHaveBeenCalledWith({
        rows: 3,
        cols: 3,
        withHeaderRow: true,
      });
    });

    it('should handle undo and redo clicks', () => {
      const mockEditor = require('@tiptap/react').useEditor();
      render(<TiptapEditor {...defaultProps} />);

      const undoButton = screen.getByTitle('Undo');
      fireEvent.click(undoButton);

      expect(mockEditor.chain().focus().undo().run).toHaveBeenCalled();

      const redoButton = screen.getByTitle('Redo');
      fireEvent.click(redoButton);

      expect(mockEditor.chain().focus().redo().run).toHaveBeenCalled();
    });

    it('should handle link addition with prompt', () => {
      const mockEditor = require('@tiptap/react').useEditor();
      render(<TiptapEditor {...defaultProps} />);

      const linkButton = screen.getByTitle('Add Link');
      fireEvent.click(linkButton);

      expect(window.prompt).toHaveBeenCalledWith('Enter URL:', 'https://example.com');
      expect(mockEditor.chain().focus().setLink).toHaveBeenCalledWith({
        href: 'https://example.com',
        target: '_blank',
      });
    });

    it('should handle link removal when empty URL provided', () => {
      const mockEditor = require('@tiptap/react').useEditor();
      (window.prompt as jest.Mock).mockReturnValue('');
      
      render(<TiptapEditor {...defaultProps} />);

      const linkButton = screen.getByTitle('Add Link');
      fireEvent.click(linkButton);

      expect(mockEditor.chain().focus().extendMarkRange().unsetLink().run).toHaveBeenCalled();
    });

    it('should handle cancelled link prompt', () => {
      const mockEditor = require('@tiptap/react').useEditor();
      (window.prompt as jest.Mock).mockReturnValue(null);
      
      render(<TiptapEditor {...defaultProps} />);

      const linkButton = screen.getByTitle('Add Link');
      fireEvent.click(linkButton);

      // Should not set or unset link when cancelled
      expect(mockEditor.chain().focus().setLink).not.toHaveBeenCalled();
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
      expect(screen.getByDisplayValue('<p>Mock content</p>')).toBeInTheDocument();
    });

    it('should update content when editing in code view', () => {
      render(<TiptapEditor {...defaultProps} />);

      const codeViewButton = screen.getByTitle('Code View');
      fireEvent.click(codeViewButton);

      const textarea = screen.getByDisplayValue('<p>Mock content</p>');
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
    it('should show AI image generation button with selected text', () => {
      render(<TiptapEditor {...defaultProps} />);

      // AI image generation button should be visible
      expect(screen.getByTitle('Generate Image from Selection')).toBeInTheDocument();
    });

    it('should handle AI image generation', async () => {
      render(<TiptapEditor {...defaultProps} />);

      const aiImageButton = screen.getByTitle('Generate Image from Selection');
      fireEvent.click(aiImageButton);

      expect(global.fetch).toHaveBeenCalledWith('/api/ai/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: 'Mock content' }),
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

      const aiImageButton = screen.getByTitle('Generate Image from Selection');
      fireEvent.click(aiImageButton);

      // Should show loading state
      expect(aiImageButton).toBeDisabled();
    });

    it('should insert generated image into editor', async () => {
      const mockEditor = require('@tiptap/react').useEditor();
      render(<TiptapEditor {...defaultProps} />);

      const aiImageButton = screen.getByTitle('Generate Image from Selection');
      fireEvent.click(aiImageButton);

      // Wait for async operation
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockEditor.chain().focus().setImage).toHaveBeenCalledWith({
        src: '/test-image.jpg',
        alt: 'AI generated image',
      });
    });
  });

  describe('error handling', () => {
    it('should handle AI image generation failure', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Generation failed'));
      
      render(<TiptapEditor {...defaultProps} />);

      const aiImageButton = screen.getByTitle('Generate Image from Selection');
      fireEvent.click(aiImageButton);

      // Should handle error gracefully
      await new Promise(resolve => setTimeout(resolve, 0));
      
      expect(mockEditor.chain().focus().setImage).not.toHaveBeenCalled();
    });

    it('should handle API error response', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: jest.fn().mockResolvedValue({ error: 'API error' }),
      });
      
      render(<TiptapEditor {...defaultProps} />);

      const aiImageButton = screen.getByTitle('Generate Image from Selection');
      fireEvent.click(aiImageButton);

      await new Promise(resolve => setTimeout(resolve, 0));
      
      expect(mockEditor.chain().focus().setImage).not.toHaveBeenCalled();
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

      expect(screen.getByText('100 / 500')).toBeInTheDocument();
    });

    it('should handle character count formatting correctly', () => {
      render(<TiptapEditor {...defaultProps} maxLength={1000} />);

      const characterCount = screen.getByText('100 / 1000');
      expect(characterCount).toHaveClass('text-gray-500');
    });
  });
});