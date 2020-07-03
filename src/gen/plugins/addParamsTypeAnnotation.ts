import * as recast from 'recast';
import {
    namedTypes,
    builders as b,
} from 'ast-types';
import {
    VueNode,
} from '@/node';
import * as K from 'ast-types/gen/kinds';
import {
    any,
} from '@/utils';

function handleParam(params: K.PatternKind[]) {
    const names = (params.filter(param => param.type === 'Identifier') as namedTypes.Identifier[]).map(param => param.name);
    const hasRoute = names[0] == 'to' && names[1] == 'from' && names[2] == 'next';
    params.forEach((param) => {
        if (param.type === 'Identifier') {
            if (!param.typeAnnotation) {
                if (hasRoute && param.name  === 'to' || param.name === 'from') {
                    param.typeAnnotation = b.tsTypeAnnotation(b.tsTypeReference(b.identifier('Route')));
                } else {
                    param.typeAnnotation = any();
                }
            }
        } else if (param.type === 'ObjectPattern') {
            if (!param.typeAnnotation) {
                param.typeAnnotation = any();
            }
        }
    });
    
    return hasRoute;
}

export const plugin = (node: VueNode) => {
    let hasRoute = false;

    recast.visit(node.originalAst, {
        // 处理所有的函数参数
        visitFunctionDeclaration(p) {
            const functionDeclaration = p.value as namedTypes.FunctionDeclaration;
            const params = functionDeclaration.params;
            if (params) {
                const result = handleParam(params);
                hasRoute = hasRoute || result;
            }
            this.traverse(p);
        },
        visitFunctionExpression(p) {
            const functionDeclaration = p.value as namedTypes.FunctionExpression;
            const params = functionDeclaration.params;
            if (params) {
                const result = handleParam(params);
                hasRoute = hasRoute || result;
            }
            this.traverse(p);
        },
        visitArrowFunctionExpression(p) {
            const arrowFunctionExpression = p.value as namedTypes.ArrowFunctionExpression;
            const params = arrowFunctionExpression.params;
            if (params) {
                const result = handleParam(params);
                hasRoute = hasRoute || result;
            }
            this.traverse(p);
        },
    });

    // 处理import
    const importDeclarationMap: {
        [source: string]: namedTypes.ImportDeclaration,
    } = {};

    if (node.imports) {
        node.imports.forEach((importDeclaration) => {
            if (importDeclaration.source.type === 'Literal' && typeof importDeclaration.source.value == 'string') {
                importDeclarationMap[importDeclaration.source.value] = importDeclaration;
            }
        });
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
            if (node.imports) {
                node.imports.push(declaration);
            } else {
                node.imports = [ declaration ];
            }
        }
    }
}
