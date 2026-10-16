const { version } = require('../package.json');

const conditionalStatementRegex = /\{% (?:(if|elif) ([\s\S]*?)|(else|endif)) %\}/g;
const statementRegex = /\{% ([\s\S]*?) %\}/g;
const expressionRegex = /\{\{ ([\s\S]*?) \}\}/g;
const commentRegex = /\{# ([\s\S]*?) #\}/g;
const stringRegex = /(['"`])(.*?)\1/g;
const quoteRegex = /['"`]/g;

// replacements (placeholder -> original) per linted file, in the order they were applied
const replacementsByFile = new Map();

const newRandomExpression = (length, replacements) => {
    let number = -1;
    let expression;
    do {
        number += 1;
        expression = `/${String(number).padStart(length - 2, '0')}/`;
    } while (replacements.has(expression));
    return expression;
};

// whether the match is the only content of its line
const isOnOwnLine = (string, offset, length) => {
    const lineStart = string.lastIndexOf('\n', offset - 1) + 1;
    const lineEnd = string.indexOf('\n', offset + length);
    return (
        string.slice(lineStart, offset).trim() === '' &&
        string.slice(offset + length, lineEnd === -1 ? undefined : lineEnd).trim() === ''
    );
};

const preprocess = (text, filename = '') => {
    const replacements = new Map();
    replacementsByFile.set(filename, replacements);

    // if-statements on their own lines wrap statements, all others wrap expressions
    const conditionalModes = [];

    return [
        text
            // comment
            .replace(commentRegex, (comment, content) => {
                const replacement = `/* ${content} */`;
                replacements.set(replacement, comment);
                return replacement;
            })

            // if-statement
            .replace(
                conditionalStatementRegex,
                (statement, ifKeyword, content, elseKeyword, offset, string) => {
                    const keyword = ifKeyword ?? elseKeyword;
                    if (keyword === 'if') {
                        conditionalModes.push(
                            isOnOwnLine(string, offset, statement.length)
                                ? 'statement'
                                : 'expression',
                        );
                    }
                    const mode = conditionalModes.at(-1) ?? 'expression';
                    if (keyword === 'endif') conditionalModes.pop();

                    const comment = `/*${keyword}${content === undefined ? '' : ` ${content}`} */`;
                    const replacement =
                        mode === 'statement'
                            ? comment
                            : {
                                  if: `(${comment}`,
                                  elif: `,${comment}`,
                                  else: `,${comment}`,
                                  endif: `${comment})`,
                              }[keyword];
                    replacements.set(replacement, statement);
                    return replacement;
                },
            )

            // other statements
            .replace(statementRegex, (statement, content) => {
                const replacement = `/* ${content} */`;
                replacements.set(replacement, statement);
                return replacement;
            })

            // expression in string
            // remove quotes in expressions
            .replace(expressionRegex, (expression) => {
                const replacement = expression.replace(quoteRegex, ' ');
                replacements.set(replacement, expression);
                return replacement;
            })
            // replace curly braces of expressions with whitespaces if in string
            .replace(stringRegex, (string) =>
                string.replace(expressionRegex, (expression, content) => {
                    const replacement = `   ${content}   `;
                    replacements.set(replacement, expression);
                    return replacement;
                }),
            )

            // expression
            .replace(expressionRegex, (expression) => {
                const replacement = newRandomExpression(expression.length, replacements);
                replacements.set(replacement, expression);
                return replacement;
            }),
    ];
};

const postprocess = (messages, filename = '') => {
    // undo the replacements in reverse order, as later ones were applied on top of earlier ones
    const replacements = [...(replacementsByFile.get(filename) ?? [])].reverse();
    replacementsByFile.delete(filename);

    return messages.flat().map((message) => {
        if (!message.fix) return message;

        const text = replacements.reduce(
            (fixText, [replacement, original]) => fixText.replaceAll(replacement, () => original),
            message.fix.text,
        );
        return { ...message, fix: { ...message.fix, text } };
    });
};

module.exports = {
    meta: { name: 'jinja2-processor/jinja2', version },
    preprocess,
    postprocess,
    supportsAutofix: true,
};
