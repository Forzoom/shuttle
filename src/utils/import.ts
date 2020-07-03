import { builders as b } from 'ast-types';

export const importModuleFromVuex = b.importDeclaration(
    [b.importSpecifier(b.identifier('Module'))],
    b.literal('vuex'),
);
export const importRootStateFromStoreDTS = b.importDeclaration(
    [b.importSpecifier(b.identifier('RootState'))],
    b.literal('@/types/store'),
);

/**
 * @param extra string[] 所需要引入的内容，例如Prop, Watch
 */
export function importFromVuePropertyDecorator(extra: Array<string | null>) {
    return b.importDeclaration(
        [
            b.importSpecifier(b.identifier('Component')),
            b.importSpecifier(b.identifier('Vue')),
            ...extra.filter((_) => _).map((name) => b.importSpecifier(b.identifier(name!))),
        ],
        b.literal('vue-property-decorator'),
    );
}