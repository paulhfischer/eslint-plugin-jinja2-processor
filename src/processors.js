const ifStatement = /\{% (if[\s\S]*?) %\}/g;
const elifStatement = /\{% (elif[\s\S]*?) %\}/g;
const elseStatement = /\{% (else) %\}/g;
const endifStatement = /\{% (endif) %\}/g;
const statement = /\{% ([\s\S]*?) %\}/g;
const expression = /\{\{ ([\s\S]*?) \}\}/g;
const comment = /\{# ([\s\S]*?) #\}/g;

const preprocess = (text, filename) => [
    text
        // comment
        .replace(comment, '/* $1 */')

        // if-statement
        .replace(ifStatement, '(/*$1 */')
        .replace(elseStatement, ',/*$1 */')
        .replace(elifStatement, ',/*$1 */')
        .replace(endifStatement, '/*$1 */)')

        // statement
        .replace(statement, '/* $1 */')

        // expression in string
        .replace(expression, (match) => match.replace(/['"`]/g, ' '))
        .replace(/(['"`])(.*?)\1/g, (match) => match.replace(expression, '   $1   '))

        // expression
        .replace(expression, (match) => `/${'0'.repeat(match.length - 2)}/`),
];

module.exports = {
    preprocess,
};
