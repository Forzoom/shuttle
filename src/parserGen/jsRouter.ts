import * as recast from 'recast';
import * as parser from '@babel/parser';
import { namedTypes, builders as b } from 'ast-types';
import path from 'path';
import fs from 'fs';
import { any } from '@/utils';

function getComponentFilePath(variableDeclarator: namedTypes.VariableDeclarator) {
    const varInit = variableDeclarator.init as namedTypes.ArrowFunctionExpression;
    const ensureCall = ((varInit.body as namedTypes.BlockStatement).body[0] as namedTypes.ExpressionStatement).expression as namedTypes.CallExpression;
    const resolveCall = (((ensureCall.arguments[1] as namedTypes.ArrowFunctionExpression).body as namedTypes.BlockStatement).body[0] as namedTypes.ExpressionStatement).expression as namedTypes.CallExpression;
    return ((resolveCall.arguments[0] as namedTypes.CallExpression).arguments[0] as namedTypes.StringLiteral).value;
}

function createRouteImportArrowFn(filepath: string, webpackChunkName?: string) {
    const filepathLiteral = b.stringLiteral(filepath);
    if (webpackChunkName) {
        filepathLiteral.comments = [
            b.commentBlock(` webpackChunkName: "${webpackChunkName}" `, true),
        ];
    }
    return b.arrowFunctionExpression(
        [],
        b.callExpression(b.import(), [ filepathLiteral ]),
    );
}

export default class JSRouterParserGenerator {
    public handle(input: string, output: string) {
        console.info(input, output);
        const extname = path.extname(input);
        if (extname !== '.js') {
            console.warn(input + ' isnt a js file');
            return;
        }
        if (/index.js/.test(input)) {
            console.warn(input + ' is index file');
            return;
        }
        const fileName = path.basename(input, extname);
        const originalCode = fs.readFileSync(input, 'utf-8');
        const originalAst = recast.parse(originalCode, {
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
        });

        // 解析得到 import + 组件定义 + 默认导出对象
        const importDeclarations: namedTypes.ImportDeclaration[] = [];
        const importDeclarationMap: {
            [source: string]: namedTypes.ImportDeclaration,
        } = {};
        const variableDeclarations: namedTypes.VariableDeclaration[] = [];
        let exportDefaultDeclaration: namedTypes.ExportDefaultDeclaration | null = null;
        
        for (const node of originalAst.program.body as namedTypes.Node[]) {
            if (node.type === 'ImportDeclaration') {
                const declaration = node as namedTypes.ImportDeclaration;
                importDeclarations.push(declaration);
                if (declaration.source.type == 'Literal' && typeof declaration.source.value == 'string') {
                    importDeclarationMap[declaration.source.value] = declaration;
                }
            } else if (node.type === 'VariableDeclaration') {
                variableDeclarations.push(node as namedTypes.VariableDeclaration);
            } else if (node.type === 'ExportDefaultDeclaration') {
                exportDefaultDeclaration = node as namedTypes.ExportDefaultDeclaration;
            }
        }

        // 修改默认导出对象，需要和组件定义一一对应
        const componentVariableMap: {
            [compName: string]: string,
        } = {};
        for (const variableDeclaration of variableDeclarations) {
            const declarator = variableDeclaration.declarations[0] as namedTypes.VariableDeclarator;
            if (declarator.id.type === 'Identifier') {
                const filepath = getComponentFilePath(declarator);
                componentVariableMap[declarator.id.name] = filepath;
            }
        }

        // 修改component对象内容
        if (!exportDefaultDeclaration) {
            console.warn('Cannot find export default part');
            return;
        }

        function handleRoute(route: namedTypes.ObjectExpression): boolean {
            let hasRoute: boolean = false;
            for (const property of route.properties) {
                if (property.type == 'Property' && property.key.type == 'Identifier') {
                    const name = property.key.name;
                    if (name == 'component') {
                        const originalId = property.value as namedTypes.Identifier;
                        property.value = createRouteImportArrowFn(componentVariableMap[originalId.name], fileName);
                    } else if (name == 'beforeEnter' || name == 'beforeLeave' || name == 'redirect') {
                        const functionExpression = property.value as namedTypes.FunctionExpression;
                        for (const param of functionExpression.params) {
                            if (param.type === 'Identifier' && !param.typeAnnotation) {
                                if (param.name  === 'to' || param.name === 'from') {
                                    param.typeAnnotation = b.tsTypeAnnotation(b.tsTypeReference(b.identifier('Route')));
                                    hasRoute = true
                                } else {
                                    param.typeAnnotation = any();
                                }
                            }
                        }
                    } else if (name == 'children') {
                        const array = property.value as namedTypes.ArrayExpression;
                        for (const childRoute of array.elements as namedTypes.ObjectExpression[]) {
                            const result = handleRoute(childRoute);
                            hasRoute = hasRoute || result;
                        }
                    }
                }
            }
            return hasRoute;
        }

        const routes = (exportDefaultDeclaration.declaration as namedTypes.ArrayExpression).elements as namedTypes.ObjectExpression[];
        let hasRoute = false;
        for (const route of routes) {
            const result = handleRoute(route);
            hasRoute = hasRoute || result;
        }

        if (hasRoute) {
            const importDeclaration = importDeclarationMap['vue-router'];
            if (importDeclaration) {
                if (importDeclaration.specifiers) {
                    let needImport = true;
                    for (const specifier of importDeclaration.specifiers) {
                        const imported = (specifier as namedTypes.ImportSpecifier).imported;
                        if (imported) {
                            if ((imported as namedTypes.Identifier).name === 'Route') {
                                // 已经存在Route，不需要处理
                                needImport = false;
                            }
                        }
                    }
                    if (needImport) {
                        importDeclaration.specifiers.push(b.importSpecifier(b.identifier('Route')));
                    }
                } else {
                    importDeclaration.specifiers = [ b.importSpecifier(b.identifier('Route')) ];
                }
            } else {
                const declaration = b.importDeclaration([ b.importSpecifier(b.identifier('Route')) ], b.stringLiteral('vue-router'));
                importDeclarations.push(declaration);
            }
        }

        // 添加webpackChunkName
        const generatedAst = recast.parse('');
        generatedAst.program.body.push(...importDeclarations);
        generatedAst.program.body.push(exportDefaultDeclaration);
        const code = recast.print(generatedAst, {
            tabWidth: 4,
            quote: 'single',
            trailingComma: true,
        }).code;
        fs.writeFileSync(output, code + '\n');
    }
}