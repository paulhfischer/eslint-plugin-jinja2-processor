const assert = require('assert');
const processors = require('../src/processors');

const html = `
<script>
    {# use jinja variable in variable #}
    const a = 'hello ' + {{ name }} + "!";

    {# use jinja variable in string #}
    const b = 'hello {{ name }}!'
    const c = 'hello {{ name['first'] }}!'

    {# use conditional
       jinja variable #}
    const d = {% if foo %} 'login' {% else %} 'logout' {% endif %};
    const e = {% if foo %} 'adult' {% elif bar %} 'minor' {% else %} 'unknown' {% endif %};

    {# all other expressions work too #}
    {% for i in foo %}
        console.log(bar);
    {% endfor %}
</script>
`;
const expected = `
<script>
    /* use jinja variable in variable */
    const a = 'hello ' + /00000000/ + "!";

    /* use jinja variable in string */
    const b = 'hello    name   !'
    const c = 'hello    name[ first ]   !'

    /* use conditional
       jinja variable */
    const d = (/*if foo */ 'login' ,/*else */ 'logout' /*endif */);
    const e = (/*if foo */ 'adult' ,/*elif bar */ 'minor' ,/*else */ 'unknown' /*endif */);

    /* all other expressions work too */
    /* for i in foo */
        console.log(bar);
    /* endfor */
</script>
`;

describe('preprocessor', () => {
    it('should replace comment', () => {
        assert.equal(
            processors.preprocess('foo {# hello world #} bar'),
            'foo /* hello world */ bar',
        );
    });
    it('should replace multiline comment', () => {
        assert.equal(
            processors.preprocess('foo {# hello\nworld #} bar'),
            'foo /* hello\nworld */ bar',
        );
    });
    it('should replace if-expression', () => {
        assert.equal(
            processors.preprocess('{% if foo %} hello {% else %} world {% endif %}'),
            '(/*if foo */ hello ,/*else */ world /*endif */)',
        );
        assert.equal(
            processors.preprocess('{% if foo %} hello {% elif bar %} world {% endif %}'),
            '(/*if foo */ hello ,/*elif bar */ world /*endif */)',
        );
    });
    it('should replace statement', () => {
        assert.equal(
            processors.preprocess('foo {% hello world %} bar'),
            'foo /* hello world */ bar',
        );
    });
    it('should replace mutiline statement', () => {
        assert.equal(
            processors.preprocess('foo {% hello\nworld %} bar'),
            'foo /* hello\nworld */ bar',
        );
    });
    it('should replace expression in string', () => {
        assert.equal(
            processors.preprocess("'foo {{ hello'world }} bar'"),
            "'foo    hello world    bar'",
        );
    });
    it('should replace expression', () => {
        assert.equal(processors.preprocess('foo + {{ bar }} + baz'), 'foo + /0000000/ + baz');
    });
    it('should replace html', () => {
        assert.equal(processors.preprocess(html), expected);
    });
});
