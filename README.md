# eslint-plugin-jinja2-processor

## Setup

```console
npm install --save-dev eslint-plugin-jinja2-processor
```

## Commands

Use the processor in an ESLint flat config:

```js
import html from 'eslint-plugin-html';
import jinja from 'eslint-plugin-jinja2-processor';

export default [
    {
        ...jinja.configs.recommended,
        files: ['**/*.html', '**/*.php'],
        plugins: { html, 'jinja2-processor': jinja },
    },
];
```

Install `eslint-plugin-html` alongside ESLint when linting embedded scripts.
For pure JavaScript templates, select their filenames and use the `jinja2-processor/jinja2`
processor directly. Unsafe template edits are left for manual correction.

```console
npm exec -- eslint <PATH>...
```
