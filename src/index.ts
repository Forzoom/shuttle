import './polyfill/polyfill';

// parser
export * as JSVueParser from './parser/jsVue';
export * as TSClassVueParser from './parser/tsClassVue';

// gen
export * as JSVueGenerator from './gen/jsVue';
export * as TSClassVueGenerator from './gen/tsClassVue';
import { plugin as addImportStore } from './gen/plugins/addImportStore';
import { plugin as addParamsTypeAnnotation } from './gen/plugins/addParamsTypeAnnotation';
export const genPlugin = {
    addImportStore,
    addParamsTypeAnnotation,
};

// parser generator
export * as JSStoreParserGenerator from './parserGen/jsStore';
export * as JSRouterParserGenerator from './parserGen/jsRouter';
