# mergeScript 用法

来源：前端 `packages/ui/certd-client/src/use/use-refrence.tsx`，类型定义来自 `@fast-crud/fast-crud`。

`mergeScript` 用来让输入字段的定义**依赖当前表单里的其他字段值动态变化**，例如：
选了某个鉴权方式才显示对应字段、切换类型后清空已选值、下拉选项跟着另一个字段变。

它写成字符串放在字段定义上（内置插件放在 `@AccessInput` / `@TaskInput` 里，在线插件放在 `input.<字段>` 下）：

```ts
@AccessInput({
  title: "API Key",
  component: { name: "a-input", vModel: "value" },
  mergeScript: `
    return {
      show: ctx.compute(({form})=>{
        //access里面 要用 form.access.[字段名]
        return form.access.authType === 'apikey';
        //deploy插件里面要用form.[字段名]
        return form.authType === 'apikey';
      })
    }
  `,
})
apiKey = "";
```

## 执行时机

字段定义被前端加载时，对**每一个字段**执行一次：

```js
const func = new Function('ctx', formItem.mergeScript);
const merged = func(ctx); // 字段脚本只执行这一次
merge(formItem, merged); // 返回值深合并进该字段的定义
delete formItem.mergeScript; // 执行完就删掉，最终定义里不再有 mergeScript
```

要点：

- 脚本体内**必须 `return` 一个对象**，返回的对象会深合并到本字段的定义上。
- 脚本本身只在加载字段时跑一次，**拿不到、也不应该判断用户填了什么值**。
- 真正的动态逻辑写在返回对象里的 `ctx.compute(...)` 回调中，由 fast-crud 在渲染时求值。

## ctx 提供的能力

| 能力                        | 说明                                                                                                                                        |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `ctx.compute(fn)`           | 最常用。返回一个响应式的计算值：`fn` 里读到的表单字段会被自动追踪，字段变化时重新计算，视图跟着刷新                                         |

`ctx.compute` 的回调参数是一个 context 对象，常用字段：

- `form`：当前表单数据。**这是唯一常用的一个**。
- `row`：行数据。
- `mode`：表单模式 `add` / `edit` / `view`。
- `getComponentRef(key)`：取其他字段组件的 ref。

注意：Certd 在把 `form` 传进回调前做过一次兼容处理（`form.input || form.body || form`），
所以两种表单取值路径不同：

- **授权（Access）表单**：字段值在 `form.access.xxx`（字段 key 会被加上 `access.` 前缀）。
- **任务（Task）表单**：字段值直接是 `form.xxx`。

## 可以动态化的属性

返回的对象里，任何字段定义属性都可以用 `ctx.compute`，常用的有：

| 属性                 | 用途                                                                                              |
| -------------------- | ------------------------------------------------------------------------------------------------- |
| `show`               | 显隐（最常用）                                                                                    |
| `required`           | 动态必填，例如 `required: ctx.compute(({form}) => form.targetType === 'ingress')`                 |
| `disabled`           | 动态禁用，例如账号已创建后不允许再改：`disabled: ctx.compute(({form}) => !!form.access?.account)` |
| `helper`             | 动态帮助文案，回调里按条件 `return` 不同字符串                                                    |
| `value`              | 动态默认值                                                                                        |
| `component` 下的属性 | 动态 `options`、`placeholder`、`inputKey`、`type`、`disabled` 等                                  |
| `component.on`       | 事件处理，见下面「联动」                                                                          |
| `col` / `order`      | 布局与排序                                                                                        |

只写了一层 `show` 时最简形式就是本文开头的例子。

## 联动（监听事件并改动其他字段）

`component.on` 的事件回调**不**用 `ctx.compute` 包，它本身就是回调，参数是
`{ form, $event, ... }`；`form` 同样做过 `form.input || form.body || form` 的兼容处理。
事件名按组件而定，例如 `selectedChange`。

```ts
mergeScript: `
  return {
    component: {
      on: {
        selectedChange: (scope) => {
          const form = scope.form;
          // 切换颁发机构后清空 ACME 账号，避免账号与机构不匹配
          form.acmeAccountAccessId = null;
        },
      },
    },
  }
`,
```

另一种写法是把回调也做成计算值（需要用到组件上配置的 `onSelectedChange` / `onChange` 属性）：

```ts
mergeScript: `
  return {
    component: {
      onSelectedChange: ctx.compute(({form}) => {
        return ($event) => {
          form.dnsProviderAccessType = $event.accessType;
        };
      }),
    },
  }
`,
```

两种写法都能用，优先参考同目录已有插件的写法，保持一致。

## 常见错误

- **不要用 node 侧变量决定条件**。`mergeScript` 是在插件类定义阶段（node 侧）拼出来的字符串，
  此时表单还没打开，拿不到任何用户输入；用参数拼条件等于把逻辑写死在服务端。
  条件必须原样落到 `ctx.compute` 回调里。
- **不要用 `if` 直接判断字段值**。回调必须 `return` 一个值，写成
  `show: ctx.compute(({form}) => { if (...) { return true } })` 也可以，但不要漏掉 `return`。
- **不要漏掉历史数据兼容**。新增可选字段时，历史数据里没有这个字段（值为 `undefined`），
  条件要按旧行为兜底，例如 `!form.access.authType || form.access.authType === 'aksk'`。
- **不要访问 `form.access` 以外的路径**去读授权字段，也不要在授权表单里按任务表单的路径取值。
- **不要依赖脚本执行时的副作用**（打印日志、改全局状态），它在每次打开表单时都会重新执行。

## YAML 写法（在线插件）

`mergeScript` 是含换行的脚本字符串，必须用 YAML 块标量：

```yaml
input:
  apiKey:
    title: API Key
    component:
      name: a-input
      vModel: value
    mergeScript: |2-

          return {
            show: ctx.compute(({form})=>{
              return form.access.authType === 'apikey';
            })
          }
```

导出生成的缩进比较特殊（块标量内容统一缩进），**不要手工调整缩进**：
用脚本生成 YAML，并保证导出后再导入内容一致。转换成 block scalar 时注意：

- `|` / `|2-` 等块标量不需要转义换行，不要把脚本写成带 `\n` 的单行。
- 脚本里不要出现 `??` 这类容易被误判为乱码的写法，用显式 `if (x == null)` 代替。

## 验证方式

前端表单没法在插件开发流程里直接断言，可以在后端加一个 `src/**/*.test.ts`，
按前端 `useReference` 的路径执行字段上的 `mergeScript`：

```ts
const computedGetters = [];
const ctx = {
  compute: getter => {
    computedGetters.push(getter);
    return getter;
  },
  asyncCompute: () => undefined,
  computed: () => undefined,
};
new Function('ctx', mergeScript)(ctx);
// 用假的 form 求值，断言显隐结果
const show = computedGetters[0]({ form: { access: { authType: 'apikey' } } });
```

参考实现：`packages/ui/certd-server/src/plugins/plugin-wangsu/access-input.test.ts`。
要点是断言「同一个 show 函数换 `authType` 结果会变」，证明显隐确实是运行时算的，
而不是在 node 侧定死的。
