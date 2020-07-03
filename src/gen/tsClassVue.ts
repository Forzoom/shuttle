import * as recast from 'recast';
import { VueNode, DataNode, PropNode, WatchNode, MethodNode, LifecycleNode, ComputedNode } from '@/node';
import { builders as b, namedTypes } from 'ast-types';
import { Block } from 'types/index';
import { Generator } from '@/gen/index';
import {
    any,
    writeFileSync,
    parseMemberExpression,
    camelCaseWithFirstLetter,
    importFromVuePropertyDecorator,
    camelCaseWithDollar,
    formatMemberExpression,
    formatBlock,
} from '@/utils';

export default class TSClassVueGenerator extends Generator {
    public handleCode(vueNode: VueNode) {
        // 定义class
        const clazz = b.classDeclaration(
            b.identifier(camelCaseWithFirstLetter(vueNode.name)),
            b.classBody([
                ...(vueNode.props || []).map(node => this.prop(node)),
                ...(vueNode.data || []).map(node => this.data(node)),
                ...(vueNode.computed || []).map(node => this.computed(node)),
                ...(vueNode.watch || []).map(node => this.watch(node)),
                ...(vueNode.methods || []).map(node => this.method(node)),
                ...(vueNode.lifecycles || []).map(node => this.lifecycle(node)),
            ]),
            b.identifier('Vue')
        );
        clazz.decorators = [
            b.decorator(
                b.callExpression(
                    b.identifier('Component'),
                    [
                        b.objectExpression([
                            b.property('init', b.identifier('name'), b.literal(vueNode.name)),
                            vueNode.components!,
                            vueNode.filters!,
                            vueNode.directives!,
                            vueNode.mixins!,
                        ].filter(_ => _)),
                    ],
                )
            )
        ];
        const exportDefault = b.exportDefaultDeclaration(clazz);
        exportDefault.comments = vueNode.comments;

        const importMap: {
            [source: string]: namedTypes.ImportDeclaration,
        } = {};
        if (vueNode.imports) {
            let index = -1;
            for (let i = 0, len = vueNode.imports.length; i < len; i++) {
                const importDeclaration = vueNode.imports[i];
                const source = importDeclaration.source;
                if (source.type === 'Literal' && typeof source.value == 'string') {
                    importMap[source.value] = importDeclaration;
                    if (source.value == 'vue') {
                        index = i;
                    }
                }
            }
            if (index >= 0) {
                vueNode.imports.splice(index, 1);
            }
        }

        // 处理vue-property-decorator
        const importFromVPD = importFromVuePropertyDecorator([
            vueNode.props && vueNode.props.length > 0 ? 'Prop' : null,
            vueNode.watch && vueNode.watch.length > 0 ? 'Watch' : null,
        ]);

        if (vueNode.imports) {
            vueNode.imports.push(importFromVPD);
        } else {
            vueNode.imports = [
                importFromVPD,
            ];
        }

        // 处理plugin
        for (const plugin of this.plugins) {
            plugin(vueNode);
        }

        const generatedAst = recast.parse('', {
            tabWidth: 4,
        });
        generatedAst.program.body.push(...vueNode.imports, ...vueNode.other);
        generatedAst.program.body.push(exportDefault);
        const generatedCode = recast.print(generatedAst, {
            tabWidth: 4,
            quote: 'single',
            trailingComma: true,
            arrowParensAlways: true,
        }).code;
    
        const scriptBlock: Block = {
            type: 'script',
            content: generatedCode,
            attr: {
                lang: 'ts',
            },
        };
        const code = formatBlock([ ...(vueNode.template || []), scriptBlock, ...(vueNode.style || []) ]);
        
        return code;
    }

    public handleFile(vueNode: VueNode, output: string) {
        const code = this.handleCode(vueNode);
        writeFileSync(output, code);
    }

    public data(node: DataNode) {
        const definition = b.classProperty(b.identifier(node.key), node.init, any());
        definition.access = 'public';
        definition.comments = node.comments;
        return definition;
    }

    public prop(node: PropNode) {
        const definition = b.classProperty(b.identifier(node.key), null, any());
        definition.access = 'public';
        definition.decorators = [
            b.decorator(b.callExpression(b.identifier('Prop'), [
                node.value as namedTypes.ObjectExpression,
            ]))
        ];
        definition.comments = node.comments;
        return definition;
    }

    public computed(node: ComputedNode) {
        if (node.store) {
            let list: string[] = [];
            let async: boolean | undefined = false;
            const namespace = node.storeNamespace ? node.storeNamespace.split('/') : [];
            if (node.value.type === 'FunctionExpression') {
                const functionExpression = node.value;
                list = parseMemberExpression((functionExpression.body.body[0] as namedTypes.ReturnStatement).argument as namedTypes.MemberExpression);
                async = functionExpression.async;
            } else if (node.value.type === 'ArrowFunctionExpression') {
                const arrowFunctionExpression = node.value;
                if (arrowFunctionExpression.body.type === 'MemberExpression') {
                    list = parseMemberExpression(arrowFunctionExpression.body);
                    async = arrowFunctionExpression.async;
                }
            }

            const memberExpression = formatMemberExpression([ 'store', 'state' ].concat(namespace).concat(list.slice(1)));
            const returnStatement = b.returnStatement(memberExpression);
            const newFunctionExpression = b.functionExpression(b.identifier(node.key), [], b.blockStatement([returnStatement]));
            newFunctionExpression.async = async;
            const declaration = b.methodDefinition('get', b.identifier(node.key), newFunctionExpression);
            declaration.accessibility = 'public';
            declaration.comments = node.comments;
            return declaration;
        } else {
            const declaration = b.methodDefinition('get', b.identifier(node.key), node.value);
            declaration.accessibility = 'public';
            declaration.comments = node.comments;
            return declaration;
        }
    }

    public watch(node: WatchNode) {
        // todo: 需要修改函数的名字
        const declaration = b.tsDeclareMethod(b.identifier('on' + camelCaseWithDollar(node.key) + 'Change'), node.value.params);
        declaration.kind = 'method'; // 是一个正常函数
        declaration.async = node.value.async; // 是否async
        // @ts-ignore
        declaration.value = node.value; // 函数体内容
        declaration.accessibility = 'public';
        declaration.decorators = [
            b.decorator(b.callExpression(b.identifier('Watch'), [
                b.literal(node.key),
            ])),
        ];
        declaration.comments = node.comments;
        return declaration;
    }

    public method(node: MethodNode) {
        const functionExpression = b.functionExpression(b.identifier(node.key), node.value.params, node.value.body as namedTypes.BlockStatement);
        functionExpression.async = node.value.async;
        const declaration = b.methodDefinition('method', b.identifier(node.key), functionExpression);
        declaration.accessibility = 'public';
        // console.log(method.comments, functionExpression.comments);
        declaration.comments = node.comments;
        return declaration;
    }

    public lifecycle(node: LifecycleNode) {
        const declaration = b.methodDefinition('method', b.identifier(node.key), node.value);
        declaration.accessibility = 'public';
        declaration.comments = node.comments;

        return declaration;
    }
}