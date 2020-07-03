import fs from 'fs';
import postcss from 'postcss';
import less from 'postcss-less';
import JSVueParser from '@/parser/jsVue';

/**
 * 移除unit函数
 * @param {string} str
 */
function _stripUnit(str: string) {
    return /unit\(.*\)/.test(str) ? str.replace(/unit\(([^()]*?)\)/g, '$1') : str;
}

/** 添加px */
function _addUnit(str: string) {
    const n = Number(str);
    return isNaN(n) ? str : str + 'px';
}

/**
 * 将px2rem系列代码移除
 */
const plugin = postcss.plugin('postcss-test-plugin', (opts) => {
    opts = opts || {};
    return (root, result) => {
        // console.log('target1', root);
        root.walkRules((rule) => {
            // decl.value = '40px';
            // console.log(rule);
            // rule.walkAtRules((atRule) => {
            //     console.log(atRule);
            // });

            for (var i = 0, len = (rule.nodes || []).length; i < len; i++) {
                var node = rule.nodes![i];
                if (node.type == 'atrule' && node.name == 'px2rem6') {
                    const params = node.params.substring(1, node.params.length - 1).split(/\s*,\s*/);
                    const prop = params[0];
                    const value = params.slice(1).map(value => _addUnit(_stripUnit(value))).join(' ');
                    const decl = postcss.decl({ prop, value });
                    decl.important = node.important;
                    decl.raws.before = node.raws.before;
                    rule.nodes![i] = decl;
                }
            }
        });
    };
});

const enhancedPostcss = postcss([plugin]);

/**
 * 处理代码
 */
export async function handleCode(code: string) {
    return enhancedPostcss.process(code, { syntax: less });
}

/**
 * 处理less文件
 */
export async function handleLessFile(src: string, dst: string) {
    dst = dst || src;
    const code = fs.readFileSync(src, 'utf-8');
    const newCode = await handleCode(code);
    fs.writeFileSync(dst, newCode.toString());
}

/**
 * 处理vue文件
 */
export async function handleVueFile(src: string, dst: string) {
    dst = dst || src;
    const code = fs.readFileSync(src, 'utf-8');

    const parser = new JSVueParser();
    const parseResult = parser.handleFile(src);
    for (const block of (parseResult.style || [])) {
        console.log(handleCode(block.content));
    }
}