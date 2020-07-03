import * as recast from 'recast';
import { builders as b, namedTypes } from 'ast-types';
import { NodePath } from 'ast-types/lib/node-path';
import {
    tsPropertySignature,
} from './b';
import { ExportDefaultKey } from 'types';

export class Extract<T extends namedTypes.Printable = namedTypes.Printable> {
    public ast: any;

    public constructor(ast: any) {
        this.ast = ast;
    }

    public withDeclaration(p: NodePath) {
        return p.value.declaration;
    }
    public getValueWithAddId(p: NodePath) {
        p.value.value.id = b.identifier(p.value.key.name);
        return p.value.value;
    }
    public asPropertiesInObject(p: NodePath) {
        return p.value.value.properties;
    }

    public extractExportDefault(): namedTypes.ExportDefaultDeclaration | null {
        let result: namedTypes.ExportDefaultDeclaration | null = null;
        recast.visit(this.ast, {
            visitProperty(path) {
                if (path.value.type === 'ExportDefaultDeclaration') {
                    result = path.value;
                    // todo: 如何终止?
                    this.traverse(false);
                } else {
                    this.traverse(path);
                }
            },
        });
        return result;
    }

    public extractFromExportDefault(name: ExportDefaultKey): namedTypes.Property | null {
        let result: namedTypes.Property | null = null;
        recast.visit(this.ast, {
            visitProperty(path) {
                if (path.value) { // Property
                    const parentPath1 = path.parentPath;
                    if (parentPath1) { // Array
                        const parentPath2 = parentPath1.parentPath;
                        if (parentPath2) { // ExportDefaultDeclaration
                            const parentPath3 = parentPath2.parentPath;
                            if (parentPath3 && parentPath3.value.type === 'ExportDefaultDeclaration' && path.value.key.name === name) {
                                result = path.value;
                            }
                        }
                    }
                }
                this.traverse(path);
            },
        });
        return result;
    }
}
