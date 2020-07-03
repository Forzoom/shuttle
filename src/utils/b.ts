import { builders as b } from 'ast-types';

export function tsPropertySignature(id: string, reference: string) {
    return b.tsPropertySignature(b.identifier(id), b.tsTypeAnnotation(b.tsTypeReference(b.identifier(reference))));
}

export function any() {
    return b.tsTypeAnnotation(b.tsAnyKeyword());
}