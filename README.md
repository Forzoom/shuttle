<p align="left">
  <a href="https://www.npmjs.com/package/@forzoom/shuttle"><img src="https://img.shields.io/npm/v/@forzoom/shuttle.svg?sanitize=true" alt="Version"></a>
  <a href="https://www.npmjs.com/package/@forzoom/shuttle"><img src="https://img.shields.io/npm/l/@forzoom/shuttle.svg?sanitize=true" alt="License"></a>
</p>

### Start

```bash
# 全局安装
# npm
npm install @forzoom/shuttle -g
# yarn
yarn global add @forzoom/shuttle

# 或者
# npm
npm install @forzoom/shuttle
# yarn
yarn add @forzoom/shuttle
```

### Usage

目前开发只是暂时告一段落，测试尚不完全，谨慎在生产环境使用。

#### 命令行形式

@forzoom/shuttle库提供了命令行形式

```bash
shuttle --help # 查看提示信息
```

```bash
# 将jsVue格式转换成tsClassVue格式
shuttle -s=/path/to/src/component.vue\ # 指定源文件路径
  -d=/path/to/dst/component.vue\ # 指定生成文件路径
  -p=jsVue\ # 指定parser
  -g=tsClassVue\ # 指定generator
  --generator-plugin=addImportStore\ # 指定generator插件
  --generator-plugin=addParamsTypeAnnotation # 指定generator插件
```

```bash
# 将js格式的store转换成ts格式的store
shuttle -s=/path/to/src/component.vue\ # 指定源文件路径
  -d=/path/to/dst/component.vue\ # 指定生成文件路径
  --parser-generator=jsStore\ # 指定parser
```

#### parser

支持: `jsVue`、`tsClassVue`

其中

`jsVue`格式为
```javascript
export default {
    name: 'Cmp',
}
```
`tsClassVue`格式为
```typescript
@Component({
    name: 'Cmp',
})
export default class Cmp extends Vue {}
```

#### generator

支持: `jsVue`、`tsClassVue`，其格式类型和解析器中相同

#### parserGenerator

支持: `jsStore`、`jsRouter`，用于将js格式的 store、router 文件转换成 ts 格式

```javascript
// js格式的store
export default {
    namespaced: true,
    state: {
        foo: 'bar',
    },
    // ..
}
```

```typescript
// ts格式的store
import { Module } from 'vuex';
export interface MyState {
    foo: string;
}

const m: Module<MyState, RootState> = {
    namespaced: true,
    state: {
        foo: 'bar',
    },
    // ..
}
```

```javascript
// js格式的router
const MyPage = resolve => {
    require.ensure([], (require) => {
        resolve(require('@/pages/myPage.vue'));
    }, 'page');
};

export default [
    {
        path: '/my_page',
        name: ROUTE_NAME.MY_PAGE,
        meta: {
            title: 'xxx',
        },
        component: MyPage,
    },
];
```

```typescript
// ts格式的router

export default [
    {
        path: '/my_page',
        name: ROUTE_NAME.MY_PAGE,
        meta: {
            title: 'xxx',
        },
        component: () => import(/* webpackChunkName: "page" */ '@/pages/myPage.vue'),
    },
];
```

#### generator-plugin

支持: `addImportStore`、`addParamsTypeAnnotation`

其中:
addImportStore: 用于处理vue文件时，在必要的时候自动添加`import '@/store'`
addParamsTypeAnnotation: 为函数参数自动添加`any`类型，为路由钩子自动添加`Route`类型

### 使用config file形式

```bash
# 查看config file template
shuttle --cfg-tpl
```

```bash
shuttle # 默认寻找pwd下的shuttle.config.json路径，如果没有找到，将不断向上寻找
```

### 已知问题

1. 不支持store.state为function的模式

### Test

仅进行部分Test
