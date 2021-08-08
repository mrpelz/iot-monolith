export function parse(input: string): string | number | boolean {
  if (input === 'true') return true;
  if (input === 'false') return false;

  const number = Number(input);
  if (!Number.isNaN(number) && !Array.isArray(input)) return number;

  return input;
}

const indentMatcher = new RegExp('\\s*');
export function multiline(
  strings: TemplateStringsArray | string,
  ...tags: string[]
): string {
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
    if (lineIndent > indent) indent = lineIndent;
  }

  const text = lines
    .map((line) => `${line.slice(0, indent).trim()}${line.slice(indent)}`)
    .join('\n');

  return `${text}\n`;
}
