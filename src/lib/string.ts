export type StringEncodings = 'ascii' | 'binary' | 'latin1';
export type DynamicStringEncodings = 'utf8' | 'utf16le';

export const parse = (input: string): string | number | boolean => {
  if (input === 'true') return true;
  if (input === 'false') return false;

  const number = Number(input);
  if (!Number.isNaN(number) && !Array.isArray(input)) return number;

  return input;
};

export type MultilineFn = (nested?: boolean) => string;

const NEST_MARKER = 'de924c86-f0f3-4ecd-8fe6-e3941beeb577';

export const multiline =
  (
    raw: TemplateStringsArray | string,
    ...tags: (string | MultilineFn)[]
  ): MultilineFn =>
  (nested = false) => {
    const indent = (() => {
      if (nested) return 0;

      const protoLines = String.raw(
        { raw },
        ...Array(tags.length).fill('')
      ).split('\n');

      return protoLines.reduce((prev, line) => {
        const lineIndent = new RegExp('\\s*').exec(line)?.[0].length || 0;

        if (!lineIndent) return prev;
        if (!line.trim().length) return prev;
        if (lineIndent < prev) return lineIndent;
        return prev;
      }, 64);
    })();

    const indentString = Array(indent).fill(' ').join('');

    const result = String.raw(
      { raw },
      ...tags.map((tag) => (typeof tag === 'string' ? tag : tag(true)))
    )
      .split('\n')
      .map((line) =>
        line.startsWith(indentString) ? line.replace(indentString, '') : line
      )
      .map((line) => (line.trim().length ? line : ''))
      .join('\n');

    return nested
      ? `${NEST_MARKER}${result}${NEST_MARKER}`
      : result
          .replace(new RegExp('^\\n*'), '')
          .replace(new RegExp('\\n*$'), '')
          .replaceAll(new RegExp(`(?:\n *)?${NEST_MARKER}`, 'g'), '')
          .replaceAll(NEST_MARKER, '');
  };
