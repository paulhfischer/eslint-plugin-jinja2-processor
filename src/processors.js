const ifStatementRegex = /\{% (?:if ([\s\S]*?)) %\}/g;
const elifStatementRegex = /\{% (?:elif ([\s\S]*?)) %\}/g;
const elseStatementRegex = /\{% else %\}/g;
const endifStatementRegex = /\{% endif %\}/g;
const statementRegex = /\{% ([\s\S]*?) %\}/g;
const expressionRegex = /\{\{ ([\s\S]*?) \}\}/g;
const commentRegex = /\{# ([\s\S]*?) #\}/g;
const stringRegex = /(['"`])(.*?)\1/g;
const quoteRegex = /['"`]/g;

const replacements = new Map();

const newRandomExpression = (length) => {
    let number = -1;
    let expression;
    do {
        number += 1;
        expression = `/${String(number).padStart(length - 2, '0')}/`;
    } while (replacements.has(expression));
    return expression;
};

const preprocess = (text) => [
    text
        // comment
        .replace(commentRegex, (comment, content) => {
            const replacement = `/* ${content} */`;
            replacements.set(replacement, comment);
            return replacement;
        })

        // if-statement
        .replace(ifStatementRegex, (ifStatement, content) => {
            const replacement = `(/*if ${content} */`;
            replacements.set(replacement, ifStatement);
            return replacement;
        })
        .replace(elseStatementRegex, (elseStatement) => {
            const replacement = `,/*else */`;
            replacements.set(replacement, elseStatement);
            return replacement;
        })
        .replace(elifStatementRegex, (elifStatement, content) => {
            const replacement = `,/*elif ${content} */`;
            replacements.set(replacement, elifStatement);
            return replacement;
        })
        .replace(endifStatementRegex, (endifStatement) => {
            const replacement = `/*endif */)`;
            replacements.set(replacement, endifStatement);
            return replacement;
        })

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
            const replacement = newRandomExpression(expression.length);
            replacements.set(replacement, expression);
            return replacement;
        }),
];

const postprocess = (messages) => {
    const flattedMessages = [].concat(...messages);
    replacements.forEach((original, replacement) => {
        flattedMessages.forEach((message, index) => {
            if ('fix' in message) {
                flattedMessages[index].fix.text = message.fix.text.replace(replacement, original);
            }
        });
    });
    return flattedMessages;
};

module.exports = {
    preprocess,
    postprocess,
    supportsAutofix: true,
};
