import hljs from 'highlight.js';

export const getLanguageFromFilename = (filename: string): string => {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  const langMap: { [key: string]: string } = {
    ts: 'typescript',
    tsx: 'typescript',
    js: 'javascript',
    jsx: 'javascript',
    py: 'python',
    rb: 'ruby',
    java: 'java',
    cs: 'csharp',
    cpp: 'cpp',
    c: 'c',
    h: 'c',
    hpp: 'cpp',
    go: 'go',
    rs: 'rust',
    php: 'php',
    swift: 'swift',
    kt: 'kotlin',
    scala: 'scala',
    html: 'html',
    css: 'css',
    scss: 'scss',
    less: 'less',
    json: 'json',
    yaml: 'yaml',
    yml: 'yaml',
    xml: 'xml',
    md: 'markdown',
    sql: 'sql',
    sh: 'bash',
    bash: 'bash',
    zsh: 'bash',
    dockerfile: 'dockerfile',
  };
  return langMap[ext] || 'plaintext';
};

export const escapeHtml = (text: string): string =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/**
 * Split highlighted HTML into individual lines, properly closing and
 * reopening <span> tags at line boundaries so every line is valid HTML
 * with the correct syntax-highlighting context.
 */
export const splitHighlightedHtml = (html: string): string[] => {
  const lines: string[] = [];
  let current = '';
  const openTags: string[] = [];
  let i = 0;

  while (i < html.length) {
    if (html[i] === '\n') {
      for (let t = openTags.length - 1; t >= 0; t--) current += '</span>';
      lines.push(current);
      current = openTags.join('');
      i++;
    } else if (html[i] === '<') {
      const closeMatch = html.startsWith('</span>', i);
      if (closeMatch) {
        openTags.pop();
        current += '</span>';
        i += 7;
      } else {
        const end = html.indexOf('>', i);
        if (end === -1) {
          current += html.slice(i);
          i = html.length;
        } else {
          const tag = html.slice(i, end + 1);
          openTags.push(tag);
          current += tag;
          i = end + 1;
        }
      }
    } else {
      current += html[i];
      i++;
    }
  }
  for (let t = openTags.length - 1; t >= 0; t--) current += '</span>';
  lines.push(current);

  return lines;
};

const djb2Hash = (str: string): number => {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) | 0;
  }
  return hash;
};

const _highlightCache = new Map<string, string[]>();
const HIGHLIGHT_CACHE_MAX_SIZE = 500;

/**
 * Highlight an array of code lines as a single block for accurate
 * multi-line syntax, then split back into per-line HTML strings.
 * Results are cached by content + language hash.
 */
export const highlightLines = (texts: string[], language: string): string[] => {
  if (texts.length === 0) return [];

  const block = texts.join('\n');
  const cacheKey = `${djb2Hash(block + language)}:${block.length}`;

  const cached = _highlightCache.get(cacheKey);
  if (cached) return cached;

  let result: string[];
  try {
    const highlighted = hljs.highlight(block, {
      language,
      ignoreIllegals: true,
    }).value;
    result = splitHighlightedHtml(highlighted);
  } catch {
    result = texts.map(escapeHtml);
  }

  if (_highlightCache.size >= HIGHLIGHT_CACHE_MAX_SIZE) {
    const firstKey = _highlightCache.keys().next().value;
    if (firstKey !== undefined) _highlightCache.delete(firstKey);
  }
  _highlightCache.set(cacheKey, result);

  return result;
};
