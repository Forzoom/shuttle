import { Block, BlockType, Attrs } from 'types/index';

export const routerLifecycleNames = [ 'beforeRouteEnter', 'beforeRouteUpdate', 'beforeRouteLeave' ];
export const lifecycleNames = [ 'beforeCreate', 'created', 'beforeMount', 'mounted', 'beforeUpdate', 'updated', 'beforeDestroy', 'destroyed' ].concat(routerLifecycleNames);
export const topLevelNames = [ 'render' ].concat(lifecycleNames);

function parseAttr(str: string) {
    const parts = str.replace(/[ ]+/g, ' ').split(' ');
    const attr: { [key: string]: string } = {};
    for (const part of parts) {
        const match = part.match(/([a-z]+)=["']([a-z]+)["']/);
        if (match) {
            const [ _, key, value ] = match;
            attr[key] = value;
        }
    }
    return attr;
}

function formatAttr(attrs?: Attrs | null) {
    if (!attrs) {
        return '';
    }
    const keys = Object.keys(attrs);
    return keys.map(key => `${key}="${attrs[key]}"`).join(' ');
}

/**
 * 从Vue文件中解析三个部分，比较困难的是template部分，因为可能会存在多个template的情况，目前先只解析script和style吧
 * @param code 代码
 */
export function parseBlock(code: string) {
    const result: Block[] = [];
    const startRegexp = /<(script|template|style)(.*["'])?>/;
    const endRegexp = /<\/(script|template|style)>/;

    let terminate = false;
    let index = 0;
    let stack: Array<{ tag: string; attr?: string; type: BlockType; pos: number; }> = [];
    while (!terminate) {
        let startMatch = code.substr(index).match(startRegexp);
        let endMatch = code.substr(index).match(endRegexp);

        if (startMatch && endMatch) {
            const [ startTag, startType, startAttrStr ] = startMatch;
            const [ endTag, endType ] = endMatch;

            const startPos = code.indexOf(startTag, index);
            const endPos = code.indexOf(endTag, index);

            if (startPos < endPos) {
                stack.push({
                    tag: startTag,
                    attr: startAttrStr,
                    type: startType as BlockType,
                    pos: startPos,
                });

                index = startPos + startTag.length;
            } else {
                if (stack.length > 0) {
                    // 弹栈
                    if (endType === stack[stack.length - 1].type) {
                        const start = stack.pop()!;
                        if (stack.length === 0) {
                            result.push({
                                type: start.type,
                                content: code.substring(start.pos + start.tag.length, endPos),
                                attr: start.attr ? parseAttr(start.attr) : null,
                            });
                        }
                    }
                }
                index = endPos + endTag.length;
            }
        } else if (endMatch) {
            const [ endTag, endType ] = endMatch;

            const endPos = code.indexOf(endTag, index);

            if (stack.length > 0) {
                // 弹栈
                if (endType === stack[stack.length - 1].type) {
                    const start = stack.pop()!;
                    if (stack.length === 0) {
                        result.push({
                            type: start.type,
                            content: code.substring(start.pos + start.tag.length, endPos),
                            attr: start.attr ? parseAttr(start.attr) : null,
                        });
                    }
                }
            }
            index = endPos + endTag.length;
        } else {
            terminate = true;
        }
    }

    return result;
}

/**
 * 根据代码block生成代码
 * @param blocks 所有的代码block
 */
export function formatBlock(blocks: Block[]) {
    return blocks.map(block => `<${block.type} ${formatAttr(block.attr)}>\n${block.content}\n</${block.type}>\n`).join('');
}
