const ifStatementRegex = /\{% (?:if ([\s\S]*?)) %\}/g;
const elifStatementRegex = /\{% (?:elif ([\s\S]*?)) %\}/g;
const elseStatementRegex = /\{% else %\}/g;
const endifStatementRegex = /\{% endif %\}/g;
const statementRegex = /\{% ([\s\S]*?) %\}/g;
const expressionRegex = /\{\{ ([\s\S]*?) \}\}/g;
const commentRegex = /\{# ([\s\S]*?) #\}/g;
const stringRegex = /(['"`])(.*?)\1/g;
const quoteRegex = /['"`]/g;

const preprocess = (text) => [
    text
        // comment
        .replace(commentRegex, (comment, content) => {
            return `/* ${content} */`;
        })

        // if-statement
        .replace(ifStatementRegex, (ifStatement, content) => {
            return `(/*if ${content} */`;
        })
        .replace(elseStatementRegex, () => {
            return `,/*else */`;
        })
        .replace(elifStatementRegex, (elifStatement, content) => {
            return `,/*elif ${content} */`;
        })
        .replace(endifStatementRegex, () => {
            return `/*endif */)`;
        })

        // other statements
        .replace(statementRegex, (statement, content) => {
            return `/* ${content} */`;
        })

        // expression in string
        // remove quotes in expressions
        .replace(expressionRegex, (expression) => {
            return expression.replace(quoteRegex, ' ');
        })
        // replace curly braces of expressions with whitespaces if in string
        .replace(stringRegex, (string) =>
            string.replace(expressionRegex, (expression, content) => {
                return `   ${content}   `;
            }),
        )

        // expression
        .replace(expressionRegex, (expression) => {
            return `/${'0'.repeat(expression.length - 2)}/`;
        }),
];

module.exports = {
    preprocess,
    supportsAutofix: true,
};
