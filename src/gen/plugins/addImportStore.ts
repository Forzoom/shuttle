import { builders as b } from 'ast-types';
import { VueNode } from '@/node';
import { GeneratorPlugin } from 'types';

export const plugin: GeneratorPlugin = (node: VueNode) => {
    let hasStore = false;
    if (node.computed) {
        for (const computed of node.computed) {
            if (computed.store) {
                hasStore = true;
            }
        }
    }

    if (!hasStore) {
        return;
    }

    let hasImport = false;
    // 如果已经有import store了，那么将不再引入
    if (node.imports) {
        node.imports.forEach((importDeclaration) => {
            if (importDeclaration.specifiers) {
                for (const specifier of importDeclaration.specifiers) {
                    if (specifier.type == 'ImportDefaultSpecifier' && specifier.local?.name == 'store') {
                        hasImport = true;
                    }
                }
            }
        });
    }

    if (!hasImport) {
        const declaration = b.importDeclaration([b.importDefaultSpecifier(b.identifier('store'))], b.literal('@/store'));
        if (node.imports) {
            node.imports.push(declaration);
        }
    }
}
