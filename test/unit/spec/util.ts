import { parseBlock } from '../../../src/utils/vue';
import {expect} from 'chai';

describe('utils', () => {
    it('parseBlock', () => {
        const code = `
<template lang='html'>
    <div>
        <template v-if="(!a || !!b.test) && A[0] || (1 / 2 * 3 + 4 - 5 > 0)"></template>
        <script></script>
    </div>
</template>

<script>
console.log('test');
</script>
`;
        const result = parseBlock(code);
        console.log(result);
        expect(result).to.be.an('array');
        expect(result.length).to.equal(2);
        expect(result[0].type).to.equal('template');
        expect(result[0].content).to.equal(`
    <div>
        <template v-if="(!a || !!b.test) && A[0] || (1 / 2 * 3 + 4 - 5 > 0)"></template>
        <script></script>
    </div>
`);
        expect(result[0].attr).to.have.property('lang');
        expect(result[0].attr!.lang).to.equal('html');
        expect(result[1].type).to.equal('script');
        expect(result[1].content).to.equal(`
console.log('test');
`);
    });
});