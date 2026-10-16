# eslint-plugin-jinja2-processor

ESLint-plugin to enable linting of Jinja-templated files.

It replaces Jinja comments, statements and expressions with valid JavaScript before linting and
restores them in autofixes afterwards. Use it together with
[`eslint-plugin-html`](https://github.com/BenoitZugmeyer/eslint-plugin-html) to lint scripts in
Jinja-templated HTML files.

### Usage

1. Install via `npm`:

    ```
    npm install --save-dev eslint-plugin-jinja2-processor
    ```

2. Add the plugin to your `eslint.config.js` (ESLint 9 or newer):

    ```js
    import jinja2 from 'eslint-plugin-jinja2-processor';

    export default [jinja2.configs.recommended];
    ```

    The recommended config applies the processor to all `*.html` files. To use it for other files,
    configure the processor yourself:

    ```js
    import jinja2 from 'eslint-plugin-jinja2-processor';

    export default [
        {
            files: ['**/*.jinja'],
            plugins: { 'jinja2-processor': jinja2 },
            processor: 'jinja2-processor/jinja2',
        },
    ];
    ```

_Note: Version 2 only supports flat configs. Use version 1 for ESLint 8 and `.eslintrc`-files._
