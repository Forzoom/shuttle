import { VueNode } from '@/node';
import { handleCode } from '@/less';

export const plugin = async (node: VueNode) => {
    const blocks = (node.style || []);
    for (const block of blocks) {
        if (!block.attr || !block.attr.lang || block.attr.lang !== 'less') {
            continue;
        }
        block.content = (await handleCode(block.content)).toString();
    }
}