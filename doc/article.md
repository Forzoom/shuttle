更新于2020-02-29

1. 补充ast-types/def相关的说明

> 项目整理中，完成后补上Github链接

[Typescript](https://www.typescriptlang.org)正广泛成为前端工程师开发项目的首选，我手头上有一些使用js编写的Vue项目，最近准备使用ts重写。项目中单单是页面的数量就超过100个，更不用提组件的数量，如果对这么多Vue文件进行一一重写的话，工程量浩大，并且十分枯燥。其实在此之前也手动转换过几个项目，发现转换过程大多都是重复劳动，是有可能通过程序实现自动转换。当然从js转换成ts，不可避免地会出现类型问题，所以只要求完成重复性地工作，当真的需要类型信息时，还是需要手动处理。

使用ts来编写项目时，可以使用两种不同的代码风格：

1. 使用Vue.extend方法实现。
2. 使用class语法配合[vue-property-decorator](https://www.npmjs.com/package/vue-property-decorator)实现。

具体应该选择哪种方案，见仁见智。我所采用的是方法2。为什么选择它，如果使用方法1的话重写起来岂不是很方便？选择方法2是因为在Vue中大量使用`this`关键字，使用class形式更加符合直觉——所有的内容都是在class实例上（其实可能只是我比较喜欢折腾( ´･ᴗ･` )。

### 实现思路

实现思路就和把大象装进冰箱一样简单:

1. 将旧代码转换成AST（Abstract Syntax Tree, 抽象语法树）。
2. 将AST修改成class形式。（类型信息自然没法全部填上，可以先用any或者选择不填写）
3. 将AST转换成新代码。

关于什么是抽象语法树，可以在网上查找相关资料详细了解（我觉得对于抽象语法树有一定的了解是很有必要的）。简单来说，js代码可以用一个树形结构表示，这个树形结构就是抽象语法树。例如：

```javascript
function foo() {
    return a + b;
}
```

对应的AST可能是下图这样的，一个简单的树形结构（当然这里做了很大程度的简化，实际上要复杂地多）。

<img src="https://static.playground.forzoom.tech/article/2.png" />

如果希望将代码中的b修改为c，那么只需要修改树中的节点就可以，例如这样：

<img src="https://static.playground.forzoom.tech/article/1.png" />

之后再用修改后的AST生成代码就可以了。

### 代码和AST的转换

[recast](https://www.npmjs.com/package/recast)是一个可以方便对代码和AST进行转换的库，可以帮我们打开冰箱门和关上冰箱门。

这里必须再提到两个概念，分别是**estree**和**ast-types**。

[estree](https://github.com/estree/estree)是将js代码解析成AST的一个社区标准，也就是，**最终生成的AST节点中有哪些值，目前基本上都应该参照estree中的说明进行实现。**对这个标准有一些的了解，或者说对于编译原理有一定的了解，可以提高之后修改代码的效率。

#### 关于ast-types

[ast-types](https://www.npmjs.com/package/ast-types)是recast中所使用的库，**提供了语法树节点定义、遍历等功能，在项目中被重度使用**。ast-types中所定义的类型兼容estree，但实际使用中，感觉有时会有一些缺失，例如在某些情况下，会存在decorators字段不存在的情况，可以通过d.ts文件对ast-types中的类型定义进行扩展。

以下是一段代码示例，使用ast-types来构建AST

```javascript
// 操作AST中的一些节点
import {
    builders as b,
} from 'ast-types';

const clazz = b.classDeclaration(
    b.identifier(camelCaseWithFirstLetter('MyComponent')),
    b.classBody([]),
    b.identifier('Vue')
);
clazz.decorators = [
    b.decorator(
        b.callExpression(
            b.identifier('Component'),
            [
                b.objectExpression([
                    b.property('init', b.identifier('name'), b.literal('MyComponent')),
                ],
            ],
        )
    )
];
```

```javascript
// 上个代码片段所对应的代码
@Component({
    name: 'MyComponent',
})
class MyComponent extends Vue {}
```

上面的操作AST代码看起来让人害怕，其仅仅是对应3行ts代码。

<img src="https://static.playground.forzoom.tech/article/emoticon/zhi_ming.jpg" />

加上大部分人的编译原理课说不定已经还给老师，更别提js的语法。不过也别那么害怕，ast-types已经为我们准备好了小抄。
在ast-types/def/core.ts文件中可以看到这样的代码。

```javascript
// ast-types/def/core.ts
var BinaryOperator = or(
    "==", "!=", "===", "!==",
    "<", "<=", ">", ">=",
    "<<", ">>", ">>>",
    "+", "-", "*", "/", "%", "**",
    "&",
    "|", "^", "in",
    "instanceof");

def("BinaryExpression")
    .bases("Expression")
    .build("operator", "left", "right") // 所需要的参数
    .field("operator", BinaryOperator)
    .field("left", def("Expression")) // 要求是一个Expression
    .field("right", def("Expression"));

def("Identifier")
    .bases("Expression", "Pattern") // 因为基于Expression再定义的Identifier，可以作为BinaryExpression的参数
    .build("name")
    .field("name", String)
    .field("optional", Boolean, defaults["false"]);
```

上面其实是ast-types对于js语法的定义。**def的定义，将在builders中生成对应的函数，例如根据上面的定义，builders对象中应该有`binaryExpression`和`identifier`两个函数**，并且两个函数的参数都可以从上面代码中看出。当然如果使用IDE也会提示函数的参数，会更方便一些。

```javascript
import { builders as b } from 'ast-types';
// a + b 所对应的代码
b.binaryExpression('+', b.identifier('a'), b.identifier('b'));
```

如果对于编译原理了解的不是那么清楚的话，那么也可以通过recast.parse一些代码，来了解应该如何写，之后依葫芦画瓢编写代码就可以。

```javascript
const ast = recast.parse(`const foo = 'bar'`);
console.log(ast.program.body); // 可以参照输出结果"逆向"写出ast操作代码
```

#### 选择parser

在recast.parse解析代码时，会默认使用[esprima](https://www.npmjs.com/package/esprima)来进行语法解析，esprima（目前为4.0.1版本）对js新语法已经有了较多的支持，但是对于目前的项目中说，还是有部分语法无法解析。为了解决这个问题，recast也可以自定义所使用的语法解析器。

我还找到另外两个语法解析库，分别是[@typescript-eslint/typescript-estree](https://www.npmjs.com/package/@typescript-eslint/typescript-estree)和[@babel/parser](https://www.npmjs.com/package/@babel/parser)，其中@typescript-eslint/typescript-estree对于目前vue-property-decorator中使用的修饰器语法并不支持，所以最终选择@babel/parser。

```typescript
// 使用自定义的语法解析库
const ast = recast.parse(jsScript, {
    parser: {
        parse(source: string, options: any) {
            return parser.parse(source, Object.assign(options, {
                plugins: [
                    'estree', // 支持estree格式
                    'decorators-legacy', // 支持修饰器语法
                    // 'typescript', 支持解析typescript
                ],
                tokens: true, // 必要的参数。默认为false，解析结果中缺少tokens内容，当缺少tokens时，recast将会重新使用esprima进行解析操作
            }))
        },
    },
    tabWidth: 4,
});
```

#### 对生成的代码进行细节调整

目前使用[@vue/cli](https://www.npmjs.com/package/@vue/cli)生成项目过程中，都会提示使用tslint或eslint来帮助保持代码的整洁，如果你不是使用@vue/cli来搭建项目的话，依旧推荐在项目中加上tslint或eslint。

这些库提供了一些代码规范规则，例如：“所以的引号都应该使用单引号”这样的规范，然而使用recast.print生成的代码中默认使用双引号。最终选择还是依据项目的实际情况而定，为此recast也提供一些配置选项，使其能够更灵活地生成代码。

```javascript
// 使用recast将AST转换成js代码
const code = recast.print(ast, {
    tabWidth: 4, // 使用的空格数量
    quote: 'single', // 使用单引号或者双引号
    trailingComma: true, // 使用启用trailingComma
}).code;

```

### 遍历文件

在Node中使用fs来完成对于文件的遍历

```javascript
import fs from 'fs';
const dir = '/Volumes/Repo2/repo/vue/project/src';
const dist = '/Volumes/Repo2/repo/vue/project_ast/src';
const pageDir = dir + '/pages';
const queue = [ pageDir ];

while (queue.length > 0) {
    const filePath = queue.shift();
    if (filePath) {
        const stats = fs.statSync(filePath);
        const isDirectory = stats.isDirectory();
        if (isDirectory) {
            // 如果是文件夹，将所有的子路径加入queue
            const children = fs.readdirSync(filePath);
            queue.unshift(...children.map(child => filePath + '/' + child));
        } else {
            // 如果是文件，判断是否是.vue文件
            if (filePath.indexOf('.vue') >= 0) {
                const output = dist + filePath.substr(dir.length);
                fs.mkdirSync(path.dirname(output), {
                    recursive: true,
                    mode: 0o755,
                });
                handleVue(filePath, output); // 对于vue文件进行处理
            }
        }
    }
}
```

### 后续内容

目前在自己的项目上测试，虽然已经把好多工作量自动化了，但还是好多啊（摔！

还有一个我创建的npm组件库large-list，之前使用class的形式来写，应该是因为引入了vue-property-decorator逻辑，所以最终使用rollup打包不进行uglify情况下有27K大小。使用这个库将class形式代码转换成VueOptions形式，之后再使用rollup打包同样不进行uglify只有4K大小，既能让我使用class形式来编写代码，也让最终发布用的代码足够地小。

另外既然可以完成迁移到ts语法的过程，在Vue@3正式发布之后，可能会考虑是否能将旧代码，转换成composition-api的格式。

<img src="https://static.playground.forzoom.tech/article/footer.jpg" />

主子（看我的眼神，不点个赞再走吗~

---

### 修改less

在项目迁移过程中，除了对于js内容进行修改之外，也有对样式文件的修改。目前项目中使用的是less，虽然less语法比较简单，甚至可以直接使用多次正则替换来完成修改，但是谁让我比较喜欢折腾呢。( ´･ᴗ･` )

虽然css代码和js代码差别很大，但这次仍旧通过操作AST的方式来完成修改。

依靠[postcss](https://www.npmjs.com/package/postcss)将css转换成AST（我觉得了解postcss也很重要呢），不过和recast不同，postcss并不会直接返回AST，需要使用postcss的插件（plguin）来完成这次修改。

下面例子中编写了一个简单的插件:

```javascript
import postcss from 'postcss';
const code = `
    .rule {
        width: 20px;
    }
`;
const myPlugin = postcss.plugin('postcss-my-plugin', (root, result) => {
    root.walkRule((rule) => {
        rule.walkDecl((decl) => {
            console.log(decl.prop, decl.value); // 将输出 width 和 20px
            decl.value = '40px'; // 很简单滴就将20px修改成了40px
        });
    });
});
postcss([ myPlugin ]).process(code).then((result) => {
    /**
     * 输出修改过的代码
     * .rule {
     *     width: 40px;
     * }
     */
    console.log(result.css);
})
```

更多关于使用postcss来修改less的方法就不多写了，有需要的童鞋可以自己研究一下。
