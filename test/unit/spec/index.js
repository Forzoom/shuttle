const shuttle = require('../../../dist/shuttle.cjs.js');
const { expect } = require('chai');

describe('parser + generator', () => {
    const code = `
<script>
import Test from 'test';

export default {
    name: 'Cmp',
    components: {
        Test,
    },
    methods: {
        test1() {
            setTimeout(_ => {
                console.log(_);
            });
        },
    },
};
</script>
`;
    describe('parser', () => {
        it('test', () => {
            const parser = new shuttle.JSVueParser.default();
            const parseResult = parser.handleCode(code);
            expect(parseResult.name).to.equal('Cmp');
            // expect(parseResult.components).to.be.an('array');
            // const generator = new shuttle.TSClassVueGenerator.default();
            // const result = generator.handleCode(parseResult);
            // console.log(result);
        });
    });
    describe('generator', () => {
        it('test', () => {
            const parser = new shuttle.JSVueParser.default();
            const parseResult = parser.handleCode(code);
            const generator = new shuttle.TSClassVueGenerator.default();
            generator.addPlugin(shuttle.genPlugin.addParamsTypeAnnotation);
            const result = generator.handleCode(parseResult);
            console.log(result);
        });
    });
});
