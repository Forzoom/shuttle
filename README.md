### Start

```bash
yarn add shuttle
# 或者
npm install shuttle

# 全局安装
yarn global add shuttle
# 或者
npm install shuttle -g
```

### Usage

#### 命令行形式

shuttle库提供了命令行形式

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

### Test

仅进行部分Test
