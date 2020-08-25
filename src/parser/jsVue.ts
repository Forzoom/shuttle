import * as recast from 'recast';
import fs from 'fs';
import path from 'path';
// 尝试自定义扩展ast-types的定义
import { builders as b, namedTypes } from 'ast-types';
import * as K from 'ast-types/gen/kinds';
import * as parser from '@babel/parser';

import {
    Extract,
    lifecycleNames,
    parseBlock,
} from '@/utils';
import {
    DataNode, ComputedNode, PropNode, MethodNode, WatchNode, VueNode, LifecycleNode,
} from '@/node';
import { Parser } from './index';

function handleImport(imports: namedTypes.ImportDeclaration[]) {
    imports.forEach((importDeclaration) => {
        if (importDeclaration.source.type === 'Literal' && typeof importDeclaration.source.value == 'string') {
            importDeclaration.source.value = (importDeclaration.source.value as string).replace(/\.js$/, '');
        }
    });
}

function handleProp(props: namedTypes.Property) {
    const objectExpression = props.value as namedTypes.ObjectExpression;
    return (objectExpression.properties as namedTypes.ObjectProperty[]).map((property) => {
        const node = new PropNode((property.key as namedTypes.Identifier).name, property.value);
        node.comments = property.comments;
        return node;
    });
}

function handleData(data: namedTypes.Property) {
    const functionExpression = data.value as namedTypes.FunctionExpression;
    const returnStatement = functionExpression.body.body[0] as namedTypes.ReturnStatement;
    const objectExpression = returnStatement.argument as namedTypes.ObjectExpression;
    const properties = objectExpression.properties as namedTypes.ObjectProperty[];

    return properties.map((property) => {
        const node = new DataNode((property.key as namedTypes.Identifier).name, property.value)
        node.comments = property.comments;
        return node;
    });
}

function handleComputed(computed: namedTypes.Property) {
    const result: ComputedNode[] = [];
    const objectExpression = computed.value as namedTypes.ObjectExpression;
    (objectExpression.properties as Array<namedTypes.Property | namedTypes.SpreadElement>).forEach((property) => {
        if (property.type === 'SpreadElement') {
            const l: ComputedNode[] = [];
            if (property.argument.type === 'CallExpression') {
                let namespace: string = '';
                for (const argument of property.argument.arguments) {
                    if (argument.type === 'Literal') {
                        namespace = (argument.value as string);
                    } else if (argument.type === 'ObjectExpression') {
                        // 这是所有的内容
                        for (const property of argument.properties as namedTypes.Property[]) {
                            const node = new ComputedNode((property.key as namedTypes.Identifier).name, property.value as (namedTypes.FunctionExpression | namedTypes.ArrowFunctionExpression));
                            node.store = true;
                            node.storeNamespace = namespace;
                            node.comments = property.comments;
                            l.push(node);
                        }
                    }
                }
            }
            result.push(...l);
        } else if (property.type === 'Property') {
            const node = new ComputedNode((property.key as namedTypes.Identifier).name, property.value as namedTypes.FunctionExpression);
            node.comments = property.comments;
            result.push(node);
        }
    });
    return result;
}

function handleMethod(methods: namedTypes.Property[]) {
    return methods.map(method => {
        if (method.value.type === 'FunctionExpression') {
            const node = new MethodNode((method.key as namedTypes.Identifier).name, method.value);
            node.comments = method.comments;
            return node;
        } else if (method.value.type === 'ArrowFunctionExpression') {
            const node = new MethodNode((method.key as namedTypes.Identifier).name, method.value);
            node.comments = method.comments;
            return node;
        }
    })
}

function handleWatch(list: namedTypes.Property[]) {
    return list.map((property: namedTypes.Property) => {
        const propertyKey = property.key;
        let propertyName = '';
        if (propertyKey.type === 'Identifier') {
            propertyName = propertyKey.name;
        } else if (propertyKey.type === 'Literal') {
            propertyName = propertyKey.value as string;
        }
        const method = property.value as namedTypes.FunctionExpression;

        const node = new WatchNode(propertyName, method);
        node.comments = property.comments;
        return node;
    });
}

/**
 * 对于vue文件进行处理
 */
export default class JSVueParser extends Parser {
    /**
     * 处理数据
     */
    public handleFile(input: string) {
        console.info(input);

        const extname = path.extname(input);
        if (extname !== '.vue') {
            throw new Error(input + ' isnt a vue file');
        }
        const originalCode = fs.readFileSync(input, 'utf-8');
        return this.handleCode(originalCode);
    }

    public handleCode(code: string) {
        // 解析block
        const blocks = parseBlock(code);
        const scriptBlocks = blocks.filter(block => block.type === 'script');
        if (scriptBlocks.length <= 0) {
            throw new Error('script is lost');
        }
        const originalAst = recast.parse(scriptBlocks[0].content, {
            parser: {
                parse(source: string, options: any) {
                    return parser.parse(source, Object.assign(options, {
                        plugins: [
                            'estree',
                            'decorators-legacy',
                        ],
                        tokens: true,
                    }))
                },
            },
            tabWidth: 4,
        });

        let originalExportDefault: namedTypes.ExportDefaultDeclaration | null = null;
        const importDeclarations: namedTypes.ImportDeclaration[] = [];
        let extract = new Extract(originalAst);
        const name = extract.extractFromExportDefault('name');
        const componentList = extract.extractFromExportDefault('components');
        const props = extract.extractFromExportDefault('props');
        const dataFunc = extract.extractFromExportDefault('data');
        const computed = extract.extractFromExportDefault('computed');
        const watchList = extract.extractFromExportDefault('watch');
        const methods = extract.extractFromExportDefault('methods');
        const filters = extract.extractFromExportDefault('filters');
        const directives = extract.extractFromExportDefault('directives');
        const mixins = extract.extractFromExportDefault('mixins');
        const lifecycleNodes: LifecycleNode[] = [];

        recast.visit(originalAst, {
            // 处理import
            visitImportDeclaration(d) {
                importDeclarations.push(d.value);
                this.traverse(d);
            },
            visitProperty(p) {
                const property = p.value as namedTypes.Property;
                if (property.key && property.key.type === 'Identifier') {
                    const name = property.key.name;
                    if (lifecycleNames.indexOf(name) >= 0) {
                        const node = new LifecycleNode((property.key as namedTypes.Identifier).name, property.value as namedTypes.FunctionExpression);
                        node.comments = property.comments;
                        lifecycleNodes.push(node);
                    }
                }
                this.traverse(p);
            },
        });

        if (!name) {
            throw new Error('lost name');
        }
        /** 类名，大写开头 */
        const className = (name.value as namedTypes.StringLiteral).value;

        const vueNode = new VueNode(className);
        const body = originalAst.program.body as namedTypes.Node[];
        body.forEach((item) => {
            if (item.type === 'ImportDeclaration') {
                // nothing
            } else if (item.type === 'ExportDefaultDeclaration') {
                originalExportDefault = item as namedTypes.ExportDefaultDeclaration;
            } else {
                vueNode.other.push(item);
            }
        });

        handleImport(importDeclarations);

        // 如果存在props，处理props
        let propNodes: PropNode[] = [];
        if (props) {
            propNodes = handleProp(props);
        }

        // 处理data
        let dataNodes: DataNode[] = [];
        if (dataFunc) {
            dataNodes = handleData(dataFunc);
        }

        // 处理computed
        let computedNodes: ComputedNode[] = [];
        if (computed) {
            computedNodes = handleComputed(computed);
        }

        // 处理method
        let methodNodes: MethodNode[] = [];
        if (methods) {
            methodNodes = handleMethod((methods.value as namedTypes.ObjectExpression).properties as namedTypes.Property[]).filter(_ => _) as MethodNode[];
        }

        // 处理watch
        let watchNodes: WatchNode[] = [];
        if (watchList) {
            watchNodes = handleWatch((watchList.value as namedTypes.ObjectExpression).properties as namedTypes.Property[]);
        }

        vueNode.originalAst = originalAst;
        vueNode.components = componentList;
        vueNode.filters = filters;
        vueNode.directives = directives;
        vueNode.mixins = mixins;
        vueNode.imports = importDeclarations;
        vueNode.props = propNodes;
        vueNode.data = dataNodes;
        vueNode.computed = computedNodes;
        vueNode.watch = watchNodes;
        vueNode.methods = methodNodes;
        vueNode.lifecycles = lifecycleNodes;
        if (originalExportDefault) {
            vueNode.comments = (originalExportDefault as namedTypes.ExportDefaultDeclaration).comments;
        }
        vueNode.template = blocks.filter(block => block.type === 'template');
        vueNode.style = blocks.filter(block => block.type === 'style');

        return vueNode;
    }
}
