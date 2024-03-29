export type StringEncodings = 'ascii' | 'binary' | 'latin1';
export type DynamicStringEncodings = 'utf8' | 'utf16le';

export const parse = (input: string): string | number | boolean => {
  if (input === 'true') return true;
  if (input === 'false') return false;

  const number = Number(input);
  if (!Number.isNaN(number) && !Array.isArray(input)) return number;

  return input;
};

const indentMatcher = new RegExp('\\s*');
export const multiline = (
  strings: TemplateStringsArray | string,
  ...tags: string[]
): string => {
  const _strings = [...strings];
  const parts: string[] = [];

  while (_strings.length || tags.length) {
    parts.push(_strings.shift() || '');
    parts.push(tags.shift() || '');
  }

  const lines = parts.join('').trim().split('\n');

  let indent = 0;

  for (const line of lines) {
    const lineIndent = indentMatcher.exec(line)?.[0]?.length || 0;
    if (lineIndent && (!indent || lineIndent < indent)) indent = lineIndent;
  }

  const text = lines
    .map((line) => {
      const localIndent = indentMatcher.exec(line)?.[0]?.length || 0;
      const finalIndent = localIndent < indent ? 0 : localIndent - indent;

      return `${''.padStart(finalIndent, ' ')}${line.slice(localIndent)}`;
    })
    .join('\n');

  return `${text}\n`;
};
