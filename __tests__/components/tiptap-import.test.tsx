// Debug test to isolate Tiptap import issues
import React from 'react';

describe('Tiptap Import Debug', () => {
  it('should import StarterKit mock properly', async () => {
    const StarterKit = await import('@tiptap/starter-kit');
    console.log('StarterKit:', StarterKit);
    console.log('StarterKit.default:', StarterKit.default);
    console.log('StarterKit.default.configure:', StarterKit.default?.configure);
    
    expect(StarterKit.default).toBeDefined();
    expect(StarterKit.default.configure).toBeInstanceOf(Function);
  });
  
  it('should import react hooks properly', async () => {
    const { useEditor } = await import('@tiptap/react');
    console.log('useEditor:', useEditor);
    
    expect(useEditor).toBeInstanceOf(Function);
  });
  
  it('should be able to call configure on StarterKit', async () => {
    const StarterKit = await import('@tiptap/starter-kit');
    
    expect(() => {
      const configured = StarterKit.default.configure({
        codeBlock: false
      });
      console.log('Configured extension:', configured);
    }).not.toThrow();
  });
});