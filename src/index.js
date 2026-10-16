const { name, version } = require('../package.json');
const processor = require('./processor');

const plugin = {
    meta: { name, version },
    processors: {
        jinja2: processor,
    },
    configs: {},
};

plugin.configs.recommended = {
    name: 'jinja2-processor/recommended',
    files: ['**/*.html'],
    plugins: { 'jinja2-processor': plugin },
    processor: 'jinja2-processor/jinja2',
};

module.exports = plugin;
