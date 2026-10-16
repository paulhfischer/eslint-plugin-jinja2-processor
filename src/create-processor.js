const { version } = require('../package.json');

/** @typedef {import('eslint').Linter.LintMessage} Message */
/** @typedef {import('eslint').Rule.Fix} Fix */
/** @typedef {{start: number, end: number, original: string, processed: string, padding: boolean}} Token */
/** @typedef {{original: string, processed: string, tokens: Token[]}} File */

const conditionalStatementRegex = /\{% (?:(if|elif) ([\s\S]*?)|(else|endif)) %\}/g;
const statementRegex = /\{% ([\s\S]*?) %\}/g;
const expressionRegex = /\{\{ ([\s\S]*?) \}\}/g;
const commentRegex = /\{# ([\s\S]*?) #\}/g;
const stringRegex = /(['"`])(.*?)\1/g;
const quoteRegex = /['"`]/g;

/** @param {number} length @param {Map<string, string>} replacements @param {string} source */
const expressionPlaceholder = (length, replacements, source) => {
    let number = -1;
    let expression;
    do {
        number += 1;
        expression = `/${number.toString(36).padStart(length - 2, '0')}/`;
    } while (replacements.has(expression) || source.includes(expression));
    return expression;
};

/** @param {string} string @param {number} offset @param {number} length */
const isOnOwnLine = (string, offset, length) => {
    const lineStart = string.lastIndexOf('\n', offset - 1) + 1;
    const lineEnd = string.indexOf('\n', offset + length);
    return (
        string.slice(lineStart, offset).trim() === '' &&
        string.slice(offset + length, lineEnd === -1 ? undefined : lineEnd).trim() === ''
    );
};

/** @param {string} text */
const transform = (text) => {
    /** @type {Map<string, string>} */
    const replacements = new Map();

    /** @type {('statement' | 'expression')[]} */
    const conditionalModes = [];

    return text
        .replace(commentRegex, (comment, content) => {
            const replacement = `/* ${content} */`;
            replacements.set(replacement, comment);
            return replacement;
        })

        .replace(
            conditionalStatementRegex,
            (statement, ifKeyword, content, elseKeyword, offset, string) => {
                const keyword = ifKeyword ?? elseKeyword;
                if (keyword === 'if') {
                    conditionalModes.push(
                        isOnOwnLine(string, offset, statement.length) ? 'statement' : 'expression',
                    );
                }
                const mode = conditionalModes.at(-1) ?? 'expression';
                if (keyword === 'endif') conditionalModes.pop();

                const comment = `/*${keyword}${content === undefined ? '' : ` ${content}`} */`;
                let replacement = comment;
                if (mode === 'expression') {
                    if (keyword === 'if') replacement = `(${comment}`;
                    else if (keyword === 'endif') replacement = `${comment})`;
                    else replacement = `,${comment}`;
                }
                replacements.set(replacement, statement);
                return replacement.padEnd(statement.length, ' ');
            },
        )

        .replace(statementRegex, (statement, content) => {
            const replacement = `/* ${content} */`;
            replacements.set(replacement, statement);
            return replacement;
        })

        .replace(expressionRegex, (expression) => {
            const replacement = expression.replace(quoteRegex, ' ');
            replacements.set(replacement, expression);
            return replacement;
        })
        .replace(stringRegex, (string) =>
            string.replace(expressionRegex, (expression, content) => {
                const replacement = `   ${content}   `;
                replacements.set(replacement, expression);
                return replacement;
            }),
        )

        .replace(expressionRegex, (expression) => {
            const replacement = /[\r\n]/.test(expression)
                ? `0+${expression.slice(2, -1).replace(/[^\r\n]/g, ' ')}0`
                : expressionPlaceholder(expression.length, replacements, text);
            replacements.set(replacement, expression);
            return replacement;
        });
};

/** @param {Fix} fix @param {File} file @returns {Fix | undefined} */
const restoreFix = (fix, file) => {
    const [start, end] = fix.range;
    if (start < 0 || end < start || end > file.original.length) return undefined;
    const tokens = file.tokens.filter((token) => start < token.end && end > token.start);
    if (tokens.some((token) => start > token.start || end < token.end)) return undefined;
    /** @type {Map<string, {original: string, padding: boolean, count: number}>} */
    const replacements = new Map();
    for (const token of tokens) {
        const key = token.padding ? token.processed.trimEnd() : token.processed;
        if (key.trim() === '' || file.original.includes(key)) return undefined;
        const existing = replacements.get(key);
        if (existing && existing.original !== token.original) return undefined;
        replacements.set(key, {
            original: token.original,
            padding: token.padding,
            count: (existing?.count ?? 0) + 1,
        });
    }
    let { text } = fix;
    for (const [key, replacement] of [...replacements].sort(
        ([left], [right]) => right.length - left.length,
    )) {
        if (text.split(key).length - 1 !== replacement.count) return undefined;
        const pattern = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        text = text.replace(
            new RegExp(pattern + (replacement.padding ? ' ?' : ''), 'g'),
            () => replacement.original,
        );
    }
    return { ...fix, text };
};

/** @param {string} text @param {number} line @param {number} column */
const offsetForLocation = (text, line, column) =>
    text
        .split('\n')
        .slice(0, line - 1)
        .reduce((offset, part) => offset + part.length + 1, column - 1);

/** @param {string} text @param {number} offset */
const locationForOffset = (text, offset) => {
    const prefix = text.slice(0, offset);
    return { line: prefix.split('\n').length, column: offset - prefix.lastIndexOf('\n') };
};

/** @param {Message} message @param {File} file */
const isSyntheticFormatting = (message, file) => {
    if (message.ruleId !== 'prettier/prettier') return false;
    const start = offsetForLocation(file.processed, message.line, message.column);
    const end =
        message.endLine !== undefined && message.endColumn !== undefined
            ? offsetForLocation(file.processed, message.endLine, message.endColumn)
            : start + 1;
    return file.tokens.some(
        (token) => start >= token.start && start < token.end && end <= token.end,
    );
};

/** @param {Message} message @param {File} file */
const restoreMessage = (message, file) => {
    const position = locationForOffset(
        file.original,
        offsetForLocation(file.processed, message.line, message.column),
    );
    const result = { ...message, ...position };
    if (message.endLine !== undefined && message.endColumn !== undefined) {
        const end = locationForOffset(
            file.original,
            offsetForLocation(file.processed, message.endLine, message.endColumn),
        );
        result.endLine = end.line;
        result.endColumn = end.column;
    }
    if (message.fix) {
        const fix = restoreFix(message.fix, file);
        if (fix) result.fix = fix;
        else delete result.fix;
    }
    if (message.suggestions) {
        result.suggestions = message.suggestions.flatMap((suggestion) => {
            const fix = restoreFix(suggestion.fix, file);
            return fix ? [{ ...suggestion, fix }] : [];
        });
    }
    return result;
};

const createProcessor = () => {
    /** @type {Map<string, File>} */
    const files = new Map();
    return {
        meta: { name: 'jinja2-processor/jinja2', version },
        /** @param {string} text @param {string} [filename] */
        preprocess(text, filename = '') {
            const processed = transform(text);
            const tokens = [
                ...text.matchAll(/\{# [\s\S]*? #\}|\{% [\s\S]*? %\}|\{\{ [\s\S]*? \}\}/g),
            ].map((match) => {
                const start = match.index;
                const end = start + match[0].length;
                const value = processed.slice(start, end);
                return {
                    start,
                    end,
                    original: match[0],
                    processed: value,
                    padding: match[0].startsWith('{%') && value.endsWith(' '),
                };
            });
            files.set(filename, { original: text, processed, tokens });
            return [processed];
        },
        /** @param {Message[][]} messages @param {string} [filename] */
        postprocess(messages, filename = '') {
            const file = files.get(filename);
            files.delete(filename);
            return file
                ? messages
                      .flat()
                      .filter((message) => !isSyntheticFormatting(message, file))
                      .map((message) => restoreMessage(message, file))
                : messages.flat();
        },
        supportsAutofix: true,
    };
};

module.exports = createProcessor;
