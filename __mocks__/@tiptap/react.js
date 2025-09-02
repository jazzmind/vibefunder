import React from 'react';

// Mock Tiptap React hooks and components
export const useEditor = jest.fn(() => ({
  getHTML: jest.fn(() => '<p>Mock editor content</p>'),
  getText: jest.fn(() => 'Mock editor content'),
  commands: {
    focus: jest.fn(),
    toggleBold: jest.fn(),
    toggleItalic: jest.fn(),
    toggleUnderline: jest.fn(),
    toggleStrike: jest.fn(),
    toggleCode: jest.fn(),
    setParagraph: jest.fn(),
    toggleHeading: jest.fn(),
    toggleBulletList: jest.fn(),
    toggleOrderedList: jest.fn(),
    toggleBlockquote: jest.fn(),
    toggleCodeBlock: jest.fn(),
    insertTable: jest.fn(),
    setLink: jest.fn(),
    unsetLink: jest.fn(),
    extendMarkRange: jest.fn(() => ({ unsetLink: jest.fn(() => ({ run: jest.fn() })) })),
    setImage: jest.fn(),
    setContent: jest.fn(),
    deleteSelection: jest.fn(),
    undo: jest.fn(),
    redo: jest.fn(),
  },
  isEmpty: false,
  isDestroyed: false,
  state: { 
    doc: { 
      content: { size: 100 },
      textBetween: jest.fn(() => 'Mock editor content')
    },
    selection: { from: 0, to: 20 }
  },
  isActive: jest.fn(() => false),
  can: jest.fn(() => ({
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
        extendMarkRange: jest.fn(() => ({ 
          unsetLink: jest.fn(() => ({ run: jest.fn() })),
          setLink: jest.fn(() => ({ run: jest.fn() }))
        })),
        setImage: jest.fn(() => ({ run: jest.fn() })),
        setContent: jest.fn(() => ({ run: jest.fn() })),
        deleteSelection: jest.fn(() => ({ run: jest.fn() })),
        undo: jest.fn(() => ({ run: jest.fn() })),
        redo: jest.fn(() => ({ run: jest.fn() })),
      }))
    }))
  })),
  chain: jest.fn(() => ({
    focus: jest.fn(() => ({
      toggleBold: jest.fn(() => ({ run: jest.fn() })),
      toggleItalic: jest.fn(() => ({ run: jest.fn() })),
      toggleUnderline: jest.fn(() => ({ run: jest.fn() })),
      toggleCode: jest.fn(() => ({ run: jest.fn() })),
      toggleStrike: jest.fn(() => ({ run: jest.fn() })),
      setParagraph: jest.fn(() => ({ run: jest.fn() })),
      toggleHeading: jest.fn((options) => ({ run: jest.fn() })),
      toggleBulletList: jest.fn(() => ({ run: jest.fn() })),
      toggleOrderedList: jest.fn(() => ({ run: jest.fn() })),
      toggleBlockquote: jest.fn(() => ({ run: jest.fn() })),
      toggleCodeBlock: jest.fn(() => ({ run: jest.fn() })),
      insertTable: jest.fn((options) => ({ run: jest.fn() })),
      unsetLink: jest.fn(() => ({ run: jest.fn() })),
      setLink: jest.fn((options) => ({ run: jest.fn() })),
      extendMarkRange: jest.fn(() => ({ 
        unsetLink: jest.fn(() => ({ run: jest.fn() })),
        setLink: jest.fn(() => ({ run: jest.fn() }))
      })),
      setImage: jest.fn((options) => ({ run: jest.fn() })),
      setContent: jest.fn(() => ({ run: jest.fn() })),
      deleteSelection: jest.fn(() => ({ run: jest.fn() })),
      undo: jest.fn(() => ({ run: jest.fn() })),
      redo: jest.fn(() => ({ run: jest.fn() })),
    }))
  })),
  getAttributes: jest.fn((name) => {
    if (name === 'link') return { href: 'https://example.com' };
    return {};
  }),
  storage: { 
    characterCount: { 
      characters: jest.fn(() => 100),
      words: jest.fn(() => 20)
    } 
  },
  on: jest.fn(),
  off: jest.fn(),
  destroy: jest.fn(),
}));

export const EditorContent = ({ editor, className, ...props }) => (
  <div 
    className={className} 
    data-testid="editor-content" 
    {...props}
  >
    Mock Tiptap Editor Content
  </div>
);

export const BubbleMenu = ({ children, editor, ...props }) => (
  <div data-testid="bubble-menu" {...props}>
    {children}
  </div>
);

export const FloatingMenu = ({ children, editor, ...props }) => (
  <div data-testid="floating-menu" {...props}>
    {children}
  </div>
);

export default {
  useEditor,
  EditorContent,
  BubbleMenu,
  FloatingMenu,
};