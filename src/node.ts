import {
    namedTypes,
    builders as b,
} from 'ast-types';
import * as K from 'ast-types/gen/kinds';
import {
    any,
    parseMemberExpression,
    formatMemberExpression,
    camelCaseWithDollar,
    camelCaseWithFirstLetter,
    importFromVuePropertyDecorator,
} from '@/utils';
import { Block } from 'types';

export class VueNode {
    /** 文件路径 */
    filePath?: string;

    originalAst: any;
    name: string;
    components?: namedTypes.Property | null;
    filters?: namedTypes.Property | null;
    directives?: namedTypes.Property | null;
    mixins?: namedTypes.Property | null;
    imports?: namedTypes.ImportDeclaration[] | null;
    props?: PropNode[] | null;
    data?: DataNode[] | null;
    computed?: ComputedNode[] | null;
    watch?: WatchNode[] | null;
    methods?: MethodNode[] | null;
    lifecycles?: LifecycleNode[] | null;
    comments?: K.CommentKind[] | null;

    /** template block */
    template?: Block[];
    /** style block */
    style?: Block[];
    /** 除了export和import之外的其他内容 */
    other: namedTypes.Node[] = [];

    /** 组件名字 */
    constructor(name: string) {
        this.name = name;
    }
}

export class DataNode {
    key: string;
    /** 可能是Literal */
    init: any;
    comments?: K.CommentKind[] | null;

    constructor(key: string, init: any) {
        this.key = key;
        this.init = init;
    }
}

export class ComputedNode {
    key: string;
    value: namedTypes.FunctionExpression | namedTypes.ArrowFunctionExpression;
    comments?: K.CommentKind[] | null;

    /** 是否来自store */
    store: boolean = false;
    storeNamespace?: string | null;

    constructor(key: string, value: namedTypes.FunctionExpression | namedTypes.ArrowFunctionExpression) {
        this.key = key;
        this.value = value;
    }
}

export class PropNode {
    key: string;
    value: any;
    comments?: K.CommentKind[] | null;

    constructor(key: string, value: any) {
        this.key = key;
        this.value = value;
    }
}

export class WatchNode {
    key: string;
    value: namedTypes.FunctionExpression;
    comments?: K.CommentKind[] | null;
    constructor(key: string, value: namedTypes.FunctionExpression) {
        this.key = key;
        this.value = value;
    }
}

export class MethodNode {
    key: string;
    value: namedTypes.FunctionExpression | namedTypes.ArrowFunctionExpression;
    comments?: K.CommentKind[] | null;
    constructor(key: string, value: namedTypes.FunctionExpression | namedTypes.ArrowFunctionExpression) {
        this.key = key;
        this.value = value;
    }
}

export class LifecycleNode {
    key: string;
    value: namedTypes.FunctionExpression;
    comments?: K.CommentKind[] | null;

    constructor(key: string, value: namedTypes.FunctionExpression) {
        this.key = key;
        this.value = value;
    }
}
