'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import './tiptap.css';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import CharacterCount from '@tiptap/extension-character-count';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { TextStyle } from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';

import Underline from '@tiptap/extension-underline';
import { common, createLowlight } from 'lowlight';
import { useCallback, useEffect, useState } from 'react';

// Import specific languages for syntax highlighting
import javascript from 'highlight.js/lib/languages/javascript';
import typescript from 'highlight.js/lib/languages/typescript';
import python from 'highlight.js/lib/languages/python';
import css from 'highlight.js/lib/languages/css';
import html from 'highlight.js/lib/languages/xml';

const lowlight = createLowlight(common);
// Register languages
lowlight.register('javascript', javascript);
lowlight.register('typescript', typescript);
lowlight.register('python', python);
lowlight.register('css', css);
lowlight.register('html', html);

interface TiptapEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  className?: string;
  maxLength?: number;
  onOpenMediaLibrary?: () => void;
}

const ToolbarButton = ({ 
  onClick, 
  isActive = false, 
  disabled = false, 
  children, 
  title 
}: { 
  onClick: () => void; 
  isActive?: boolean; 
  disabled?: boolean; 
  children: React.ReactNode; 
  title?: string;
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    title={title}
    className={`px-2 py-1 text-sm rounded transition-all duration-150 ${
      isActive
        ? 'bg-brand text-white shadow-sm'
        : disabled
        ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
        : 'bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300'
    }`}
  >
    {children}
  </button>
);

const MenuBar = ({ 
  editor, 
  onOpenMediaLibrary, 
  isCodeView, 
  onToggleCodeView,
  generateImageFromSelection,
  isGeneratingImage 
}: { 
  editor: any; 
  onOpenMediaLibrary?: () => void; 
  isCodeView: boolean;
  onToggleCodeView: () => void;
  generateImageFromSelection: () => void;
  isGeneratingImage: boolean;
}) => {


  const setLink = useCallback(() => {
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('Enter URL:', previousUrl);

    if (url === null) return;

    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }, [editor]);

  const addTable = useCallback(() => {
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  }, [editor]);

  const convertMarkdownToHtml = useCallback(() => {
    if (!editor) return;
    
    const content = editor.getText();
    
    // Enhanced markdown to HTML conversion
    let html = content
      // Headers (must be at start of line)
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^#### (.*$)/gim, '<h4>$1</h4>')
      .replace(/^##### (.*$)/gim, '<h5>$1</h5>')
      .replace(/^###### (.*$)/gim, '<h6>$1</h6>')
      
      // Code blocks (triple backticks)
      .replace(/```(\w+)?\n([\s\S]*?)```/gim, '<pre><code class="language-$1">$2</code></pre>')
      
      // Inline code
      .replace(/`([^`]+)`/gim, '<code>$1</code>')
      
      // Bold
      .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
      .replace(/__(.*?)__/gim, '<strong>$1</strong>')
      
      // Italic
      .replace(/\*((?!\*)(.*?))\*/gim, '<em>$1</em>')
      .replace(/_((?!_)(.*?))_/gim, '<em>$1</em>')
      
      // Strikethrough
      .replace(/~~(.*?)~~/gim, '<s>$1</s>')
      
      // Links
      .replace(/\[([^\]]+)\]\(([^)]+)\)/gim, '<a href="$2">$1</a>')
      
      // Images
      .replace(/!\[([^\]]*)\]\(([^)]+)\)/gim, '<img src="$2" alt="$1" />')
      
      // Unordered lists
      .replace(/^\* (.+$)/gim, '<li>$1</li>')
      .replace(/^- (.+$)/gim, '<li>$1</li>')
      .replace(/^\+ (.+$)/gim, '<li>$1</li>')
      
      // Ordered lists
      .replace(/^\d+\. (.+$)/gim, '<li>$1</li>')
      
      // Blockquotes
      .replace(/^> (.+$)/gim, '<blockquote><p>$1</p></blockquote>')
      
      // Horizontal rules
      .replace(/^---$/gim, '<hr>')
      .replace(/^\*\*\*$/gim, '<hr>')
      
      // Line breaks (two spaces at end of line)
      .replace(/  \n/gim, '<br/>')
      
      // Paragraphs (double line breaks)
      .replace(/\n\n/gim, '</p><p>');

    // Wrap list items in ul/ol
    if (html.includes('<li>')) {
      // Simple approach - wrap consecutive li tags
      html = html.replace(/(<li>.*?<\/li>)/gims, '<ul>$1</ul>');
      // Clean up multiple ul tags
      html = html.replace(/<\/ul>\s*<ul>/gim, '');
    }

    // Wrap in paragraphs if not already wrapped
    if (!html.includes('<h') && !html.includes('<li>') && !html.includes('<blockquote>')) {
      html = `<p>${html}</p>`;
    }

    editor.commands.setContent(html);
  }, [editor]);



  const cleanupContent = useCallback(() => {
    if (!editor) return;
    
    let html = editor.getHTML();
    
    // Remove excessive whitespace and normalize formatting
    html = html
      // Remove empty paragraphs
      .replace(/<p>\s*<\/p>/g, '')
      .replace(/<p><br\s*\/?><\/p>/g, '')
      
      // Remove excessive line breaks
      .replace(/(<br\s*\/?>){3,}/g, '<br><br>')
      
      // Normalize whitespace between elements
      .replace(/>\s+</g, '><')
      
      // Remove trailing spaces in paragraphs and headings
      .replace(/(<(p|h[1-6])[^>]*>)\s+/g, '$1')
      .replace(/\s+(<\/(p|h[1-6])>)/g, '$1')
      
      // Remove empty attributes
      .replace(/\s+(style|class)=""/g, '')
      
      // Remove excessive spaces within text
      .replace(/\s{2,}/g, ' ')
      
      // Remove non-standard formatting elements if any
      .replace(/<(font|center|u|strike)[^>]*>/g, '')
      .replace(/<\/(font|center|u|strike)>/g, '')
      
      // Clean up list formatting
      .replace(/(<li[^>]*>)\s+/g, '$1')
      .replace(/\s+(<\/li>)/g, '$1')
      
      // Remove empty list items
      .replace(/<li>\s*<\/li>/g, '')
      
      // Normalize headings (remove extra formatting)
      .replace(/<(h[1-6])[^>]*>(<[^>]+>)*\s*/g, '<$1>')
      .replace(/\s*(<\/[^>]+>)*<\/(h[1-6])>/g, '</$2>')
      
      // Remove spans with no meaningful attributes
      .replace(/<span[^>]*?>/g, '')
      .replace(/<\/span>/g, '')
      
      // Clean up table formatting
      .replace(/(<t[dh][^>]*>)\s+/g, '$1')
      .replace(/\s+(<\/t[dh]>)/g, '$1');

    editor.commands.setContent(html);
  }, [editor]);

  if (!editor) {
    return null;
  }

  if (isCodeView) {
    return (
      <div className="flex flex-wrap gap-2 p-3 border-b border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800">
        <ToolbarButton onClick={onToggleCodeView} title="Switch to Visual Editor">
          👁️ Visual
        </ToolbarButton>
        <ToolbarButton onClick={convertMarkdownToHtml} title="Convert Markdown to HTML">
          📝 MD→HTML
        </ToolbarButton>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-1 p-3 border-b border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800">
      {/* View Toggle */}
      <ToolbarButton onClick={onToggleCodeView} title="Switch to Code View">
        💻 Code
      </ToolbarButton>
      
      <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />

      {/* Text Formatting */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        isActive={editor.isActive('bold')}
        disabled={!editor.can().chain().focus().toggleBold().run()}
        title="Bold"
      >
        <strong>B</strong>
      </ToolbarButton>
      
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        isActive={editor.isActive('italic')}
        disabled={!editor.can().chain().focus().toggleItalic().run()}
        title="Italic"
      >
        <em>I</em>
      </ToolbarButton>
      
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        isActive={editor.isActive('underline')}
        title="Underline"
      >
        <u>U</u>
      </ToolbarButton>
      
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleStrike().run()}
        isActive={editor.isActive('strike')}
        disabled={!editor.can().chain().focus().toggleStrike().run()}
        title="Strikethrough"
      >
        <s>S</s>
      </ToolbarButton>

      <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />

      {/* Headings */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        isActive={editor.isActive('heading', { level: 1 })}
        title="Heading 1"
      >
        H1
      </ToolbarButton>
      
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        isActive={editor.isActive('heading', { level: 2 })}
        title="Heading 2"
      >
        H2
      </ToolbarButton>
      
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        isActive={editor.isActive('heading', { level: 3 })}
        title="Heading 3"
      >
        H3
      </ToolbarButton>

      <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />

      {/* Lists */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        isActive={editor.isActive('bulletList')}
        title="Bullet List"
      >
        • List
      </ToolbarButton>
      
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        isActive={editor.isActive('orderedList')}
        title="Numbered List"
      >
        1. List
      </ToolbarButton>

      <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />

      {/* Links & Media */}
      <ToolbarButton onClick={setLink} title="Add/Edit Link">
        🔗 Link
      </ToolbarButton>
      
      {onOpenMediaLibrary && (
        <ToolbarButton
          onClick={onOpenMediaLibrary}
          title="Insert from Media Library"
        >
          📱 Media
        </ToolbarButton>
      )}
      
      <ToolbarButton
        onClick={generateImageFromSelection}
        disabled={isGeneratingImage}
        title="Generate image from selected text"
      >
        {isGeneratingImage ? (
          <>
            <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin mr-1"></div>
            Generating...
          </>
        ) : (
          '🎨 Generate'
        )}
      </ToolbarButton>

      <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />

      {/* Blocks */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        isActive={editor.isActive('blockquote')}
        title="Quote"
      >
        " Quote
      </ToolbarButton>
      
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        isActive={editor.isActive('codeBlock')}
        title="Code Block"
      >
        {} Code
      </ToolbarButton>
      
      <ToolbarButton
        onClick={addTable}
        title="Insert Table"
      >
        ⊞ Table
      </ToolbarButton>
      
      <ToolbarButton
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
        title="Horizontal Rule"
      >
        ― Rule
      </ToolbarButton>

      <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />

      {/* Markdown Converter */}
      <ToolbarButton
        onClick={convertMarkdownToHtml}
        title="Convert Markdown to HTML"
      >
        📝 MD→HTML
      </ToolbarButton>

      <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />

      {/* Text Color */}
      <input
        type="color"
        onInput={(event) => editor.chain().focus().setColor((event.target as HTMLInputElement).value).run()}
        value={editor.getAttributes('textStyle').color || '#000000'}
        className="w-8 h-6 border border-gray-300 dark:border-gray-600 rounded cursor-pointer"
        title="Text Color"
      />
      
      {/* Cleanup */}
      <ToolbarButton
        onClick={cleanupContent}
        title="Clean up formatting and remove excessive whitespace"
      >
        🧹 Cleanup
      </ToolbarButton>
    </div>
  );
};

export default function TiptapEditor({
  content,
  onChange,
  placeholder = 'Start writing...',
  className = '',
  maxLength = 5000,
  onOpenMediaLibrary
}: TiptapEditorProps) {
  const [isCodeView, setIsCodeView] = useState(false);
  const [codeContent, setCodeContent] = useState('');
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false, // We'll use CodeBlockLowlight instead
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-brand hover:underline cursor-pointer',
        },
      }),
      Image.configure({
        HTMLAttributes: {
          class: 'max-w-full h-auto rounded-lg my-2',
        },
      }),
      CodeBlockLowlight.configure({
        lowlight,
        defaultLanguage: 'plaintext',
      }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
      TextStyle,
      Color,
      Underline,
      Placeholder.configure({
        placeholder,
      }),
      CharacterCount.configure({
        limit: maxLength,
      }),
    ],
    content,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      if (!isCodeView) {
        onChange(editor.getHTML());
      }
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm dark:prose-invert max-w-none focus:outline-none min-h-[200px] px-4 py-3',
      },
    },
  });

  // Listen for custom event to insert images from media library
  useEffect(() => {
    const handleInsertImage = (event: CustomEvent) => {
      if (editor && event.detail?.url && !isCodeView) {
        editor.chain().focus().setImage({ src: event.detail.url }).run();
      }
    };

    window.addEventListener('insertImageIntoEditor', handleInsertImage as EventListener);
    return () => {
      window.removeEventListener('insertImageIntoEditor', handleInsertImage as EventListener);
    };
  }, [editor, isCodeView]);

  // Handle code view toggle
  const toggleCodeView = useCallback(() => {
    if (!editor) return;

    if (isCodeView) {
      // Switching from code to visual
      editor.commands.setContent(codeContent);
      onChange(codeContent);
    } else {
      // Switching from visual to code
      setCodeContent(editor.getHTML());
    }
    setIsCodeView(!isCodeView);
  }, [editor, isCodeView, codeContent, onChange]);

  const handleCodeContentChange = useCallback((value: string) => {
    setCodeContent(value);
    onChange(value);
  }, [onChange]);

  const generateImageFromSelection = useCallback(async () => {
    if (!editor) return;
    
    const { from, to } = editor.state.selection;
    const selectedText = editor.state.doc.textBetween(from, to, ' ');
    
    if (!selectedText.trim()) {
      alert('Please select some text first to generate an image from it.');
      return;
    }

    try {
      setIsGeneratingImage(true);
      
      // Generate image using the ImageLibraryService
      const response = await fetch('/api/images/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `Create a professional image for: ${selectedText}`,
          tags: ['generated', 'text-to-image'],
          isPublic: false,
        }),
      });

      if (response.ok) {
        const newImage = await response.json();
        
        // Replace the selected text with the image
        editor.chain()
          .focus()
          .deleteSelection()
          .setImage({ src: newImage.blobUrl, alt: selectedText.substring(0, 100) })
          .run();
        
        console.log('Generated and inserted image:', newImage.blobUrl);
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to generate image');
      }
    } catch (error) {
      console.error('Failed to generate image:', error);
      alert('Failed to generate image. Please try again.');
    } finally {
      setIsGeneratingImage(false);
    }
  }, [editor, setIsGeneratingImage]);

  const characterCount = editor?.storage.characterCount.characters() || 0;
  const wordCount = editor?.storage.characterCount.words() || 0;

  return (
    <div className={`flex flex-col border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden ${className}`}>
              <MenuBar 
          editor={editor} 
          onOpenMediaLibrary={onOpenMediaLibrary}
          isCodeView={isCodeView}
          onToggleCodeView={toggleCodeView}
          generateImageFromSelection={generateImageFromSelection}
          isGeneratingImage={isGeneratingImage}
        />
      
      <div className="flex-1 overflow-hidden">
        {isCodeView ? (
          <textarea
            value={codeContent}
            onChange={(e) => handleCodeContentChange(e.target.value)}
            className="w-full h-full min-h-[400px] p-4 bg-gray-900 text-gray-100 font-mono text-sm border-0 resize-none focus:outline-none"
            placeholder="Enter HTML or Markdown content..."
            spellCheck={false}
          />
        ) : (
          <EditorContent 
            editor={editor} 
            className="h-full bg-white dark:bg-gray-700 text-gray-900 dark:text-white overflow-y-auto min-h-[400px]"
          />
        )}
      </div>
      
      {/* Footer with stats */}
      <div className="flex justify-between items-center px-4 py-2 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-600 text-xs text-gray-500 dark:text-gray-400">
        <div className="flex space-x-4">
          <span>{wordCount} words</span>
          <span>{characterCount}/{maxLength} characters</span>
        </div>
        {characterCount > maxLength * 0.9 && (
          <span className="text-amber-600 dark:text-amber-400">
            Approaching character limit
          </span>
        )}
      </div>
    </div>
  );
}