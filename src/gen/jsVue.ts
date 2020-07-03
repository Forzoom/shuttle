import * as recast from 'recast';
import { VueNode, DataNode, ComputedNode, PropNode, WatchNode, MethodNode, LifecycleNode } from '@/node';
import fs from 'fs';
import {
    namedTypes,
    builders as b,
} from 'ast-types';
import { Block } from 'types/index';
import { extWith, formatBlock } from '@/utils';
import { Generator } from '@/gen/index';

export default class JSClassVueGenerator extends Generator {
    public handleCode(vueNode: VueNode) {
        const dataFn = b.functionExpression(
            b.identifier('data'),
            [],
            b.blockStatement([
                b.returnStatement(
                    b.objectExpression((vueNode.data || []).map(node => this.data(node)))
                ),
            ])
        );
        const properties: namedTypes.Property[] = [];
        properties.push(b.property('init', b.identifier('name'), b.stringLiteral(vueNode.name)));
        if (vueNode.components) {
            properties.push(vueNode.components);
        }
        if (vueNode.filters) {
            properties.push(vueNode.filters);
        }
        if (vueNode.directives) {
            properties.push(vueNode.directives);
        }
        if (vueNode.mixins) {
            properties.push(vueNode.mixins);
        }
        properties.push(b.property('init', b.identifier('props'), b.objectExpression((vueNode.props || []).map(node => this.prop(node)))));
        properties.push(b.property('init', b.identifier('data'), dataFn));
        properties.push(b.property('init', b.identifier('computed'), b.objectExpression((vueNode.computed || []).map(node => this.computed(node)))));
        properties.push(b.property('init', b.identifier('watch'), b.objectExpression((vueNode.watch || []).map(node => this.watch(node)))));
        properties.push(b.property('init', b.identifier('methods'), b.objectExpression((vueNode.methods || []).map(node => this.method(node)))));
        properties.push(...(vueNode.lifecycles || []).map(node => {
            const property = b.property('init', b.identifier(node.key), node.value);
            property.comments = node.comments;
            return property;
        }));
        const obj = b.objectExpression(properties);
        const exportDefault = b.exportDefaultDeclaration(obj);
        exportDefault.comments = vueNode.comments;

        const generatedAst = recast.parse('', {
            tabWidth: 4,
        });
        generatedAst.program.body.push(...vueNode.imports, ...vueNode.other);
        generatedAst.program.body.push(exportDefault);
        const generatedCode = recast.print(generatedAst, {
            tabWidth: 4,
            quote: 'single',
            trailingComma: true,
        }).code;
        
        const scriptBlock: Block = {
            type: 'script',
            content: generatedCode,
            attr: {
                lang: 'js',
            },
        };
        const code = formatBlock([ ...vueNode.template, scriptBlock, ...vueNode.style ]);

        return code;
    }

    public handleFile(vueNode: VueNode, output: string) {
        const code = this.handleCode(vueNode);
        fs.writeFileSync(output, code);
    }

    public data(node: DataNode) {
        const property = b.property('init', b.identifier(node.key), node.init);
        property.comments = node.comments;
        return property;
    }
    
    public computed(node: ComputedNode) {
        const property = b.property('init', b.identifier(node.key), node.value);
        property.comments = node.comments;
        return property;
    }
    
    public prop(node: PropNode) {
        let value = node.value;
        if (!value) {
            value = b.objectExpression([]);
        }
        const property = b.property('init', b.identifier(node.key), value);
        property.comments = node.comments;
        return property;
    }
    
    public watch(node: WatchNode) {
        let key: namedTypes.Identifier | namedTypes.StringLiteral | null = null;
        if (node.key[0] === '$') {
            key = b.stringLiteral(node.key);
        } else {
            key = b.identifier(node.key);
        }
        // tip: 这里直接使用原本的functionExpression存在问题，将无法生成正确的function关键字
        // 也可以通过赋予一个函数名字来解决这个问题
        const functionExpression = b.functionExpression(null, node.value.params, node.value.body);
        const property = b.property('init', key, functionExpression);
        property.comments = node.comments;
        return property;
    }
    
    public method(node: MethodNode) {
        const property = b.property('init', b.identifier(node.key), node.value);
        property.comments = node.comments;
        return property;
    }
    
    public lifecycle(node: LifecycleNode) {
        // todo
    }
}