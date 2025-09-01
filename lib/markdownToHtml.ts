/**
 * Process markdown tables and convert them to HTML
 */
function processMarkdownTables(markdown: string): string {
  // More flexible table matching - look for sequences of lines with pipes
  const lines = markdown.split(/[\r\n]+/);
  let result = '';
  let i = 0;
  
  while (i < lines.length) {
    const line = lines[i];
    
    // Check if this line looks like a table row (has pipes)
    if (line.includes('|') && line.trim().startsWith('|') && line.trim().endsWith('|')) {
      // Found potential table start, collect all table lines
      const tableLines = [];
      let j = i;
      
      // Collect consecutive lines that look like table rows
      while (j < lines.length && lines[j].includes('|') && 
             (lines[j].trim().startsWith('|') || lines[j].includes('-'))) {
        tableLines.push(lines[j]);
        j++;
      }
      
      // Need at least 2 lines (header + separator) to be a valid table
      if (tableLines.length >= 2) {
        result += processTableLines(tableLines) + '\n';
        i = j;
        continue;
      }
    }
    
    result += line + '\n';
    i++;
  }
  
  return result;
}

function processTableLines(tableLines: string[]): string {
  // Find the separator line (contains dashes)
  let separatorIndex = -1;
  for (let i = 0; i < tableLines.length; i++) {
    if (tableLines[i].includes('-')) {
      separatorIndex = i;
      break;
    }
  }
  
  // If no separator found, treat first line as header and rest as body
  if (separatorIndex === -1) {
    separatorIndex = 1;
  }
  
  const headerRows = tableLines.slice(0, separatorIndex);
  const bodyRows = tableLines.slice(separatorIndex + 1);
  
  let tableHtml = '<table class="min-w-full divide-y divide-gray-200 dark:divide-gray-600 border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden mb-4">';
  
  // Process header
  if (headerRows.length > 0) {
    tableHtml += '<thead class="bg-gray-50 dark:bg-gray-700">';
    headerRows.forEach(row => {
      const cells = row.split('|').slice(1, -1); // Remove empty first/last elements
      tableHtml += '<tr>';
      cells.forEach(cell => {
        tableHtml += `<th class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">${cell.trim()}</th>`;
      });
      tableHtml += '</tr>';
    });
    tableHtml += '</thead>';
  }
  
  // Process body
  if (bodyRows.length > 0) {
    tableHtml += '<tbody class="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-600">';
    bodyRows.forEach((row, index) => {
      const cells = row.split('|').slice(1, -1); // Remove empty first/last elements
      const rowClass = index % 2 === 0 ? '' : 'bg-gray-50 dark:bg-gray-700';
      tableHtml += `<tr class="${rowClass}">`;
      cells.forEach(cell => {
        tableHtml += `<td class="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">${cell.trim()}</td>`;
      });
      tableHtml += '</tr>';
    });
    tableHtml += '</tbody>';
  }
  
  tableHtml += '</table>';
  return tableHtml;
}

/**
 * Converts markdown text to HTML
 * Based on the conversion logic from TiptapEditor component
 */
export function markdownToHtml(markdown: string): string {
  if (!markdown) return '';
  
  // Process markdown tables first (before other transformations)
  markdown = processMarkdownTables(markdown);
  
  // Enhanced markdown to HTML conversion
  let html = markdown
    // Headers (must be at start of line)
    .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold text-gray-900 dark:text-white mb-4">$1</h1>')
    .replace(/^## (.*$)/gim, '<h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-3">$1</h2>')
    .replace(/^### (.*$)/gim, '<h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">$1</h3>')
    .replace(/^#### (.*$)/gim, '<h4 class="text-base font-medium text-gray-900 dark:text-white mb-2">$1</h4>')
    .replace(/^##### (.*$)/gim, '<h5 class="text-sm font-medium text-gray-900 dark:text-white mb-2">$1</h5>')
    .replace(/^###### (.*$)/gim, '<h6 class="text-xs font-medium text-gray-900 dark:text-white mb-2">$1</h6>')
    
    // Code blocks (triple backticks)
    .replace(/```(\w+)?\n([\s\S]*?)```/gim, '<pre class="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 overflow-x-auto mb-4"><code class="language-$1 text-sm">$2</code></pre>')
    
    // Inline code
    .replace(/`([^`]+)`/gim, '<code class="bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 px-1 py-0.5 rounded text-sm">$1</code>')
    
    // Bold
    .replace(/\*\*(.*?)\*\*/gim, '<strong class="font-semibold text-gray-900 dark:text-white">$1</strong>')
    .replace(/__(.*?)__/gim, '<strong class="font-semibold text-gray-900 dark:text-white">$1</strong>')
    
    // Italic
    .replace(/\*((?!\*)(.*?))\*/gim, '<em class="italic text-gray-700 dark:text-gray-300">$1</em>')
    .replace(/_((?!_)(.*?))_/gim, '<em class="italic text-gray-700 dark:text-gray-300">$1</em>')
    
    // Strikethrough
    .replace(/~~(.*?)~~/gim, '<s class="line-through text-gray-600 dark:text-gray-400">$1</s>')
    
    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/gim, '<a href="$2" class="text-blue-600 dark:text-blue-400 hover:underline">$1</a>')
    
    // Images
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/gim, '<img src="$2" alt="$1" class="max-w-full h-auto rounded-lg mb-4" />')
    
    // Unordered lists
    .replace(/^\* (.+$)/gim, '<li class="text-gray-700 dark:text-gray-300 mb-1">$1</li>')
    .replace(/^- (.+$)/gim, '<li class="text-gray-700 dark:text-gray-300 mb-1">$1</li>')
    .replace(/^\+ (.+$)/gim, '<li class="text-gray-700 dark:text-gray-300 mb-1">$1</li>')
    
    // Ordered lists
    .replace(/^\d+\. (.+$)/gim, '<li class="text-gray-700 dark:text-gray-300 mb-1">$1</li>')
    
    // Blockquotes
    .replace(/^> (.+$)/gim, '<blockquote class="border-l-4 border-gray-300 dark:border-gray-600 pl-4 py-2 mb-4 bg-gray-50 dark:bg-gray-800"><p class="text-gray-700 dark:text-gray-300 italic">$1</p></blockquote>')
    
    // Horizontal rules
    .replace(/^---$/gim, '<hr class="border-gray-300 dark:border-gray-600 my-6">')
    .replace(/^\*\*\*$/gim, '<hr class="border-gray-300 dark:border-gray-600 my-6">')
    
    // Line breaks (two spaces at end of line)
    .replace(/  \n/gim, '<br/>')
    
    // Paragraphs (double line breaks)
    .replace(/\n\n/gim, '</p><p class="text-gray-700 dark:text-gray-300 mb-4">');

  // Wrap list items in ul/ol
  if (html.includes('<li')) {
    // Find sequences of <li> items and wrap them
    html = html.replace(/(<li[^>]*>.*?<\/li>(?:\s*<li[^>]*>.*?<\/li>)*)/gims, (match) => {
      // Check if this is an ordered list (starts with numbers)
      const hasOrderedPattern = /^\d+\./.test(match.replace(/<[^>]*>/g, '').trim());
      const listClass = hasOrderedPattern 
        ? "list-decimal list-inside space-y-1 mb-4 pl-4"
        : "list-disc list-inside space-y-1 mb-4 pl-4";
      const tag = hasOrderedPattern ? 'ol' : 'ul';
      return `<${tag} class="${listClass}">${match}</${tag}>`;
    });
  }

  // Wrap content in paragraph if it doesn't start with a block element
  if (html && !html.match(/^<(h[1-6]|p|div|ul|ol|blockquote|pre|table)/)) {
    html = `<p class="text-gray-700 dark:text-gray-300 mb-4">${html}</p>`;
  }

  return html;
}
