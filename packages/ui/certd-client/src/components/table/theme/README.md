# Fn 表格主题

Fn 的主题 token 使用 Ant Design Vue token 的语义名称，并统一使用 `--fn-` CSS 前缀，例如 `colorPrimary` 对应 `--fn-color-primary`。

`tokens.css` 提供独立使用时的默认亮色和暗色主题。不使用 AntDV 的项目无需额外配置，Fn 组件直接使用这些默认变量。

```ts
import { theme } from "ant-design-vue";
import { useAntdvTheme } from "@certd/ui-client/components/table/theme";

// 在 AConfigProvider 子树中的 setup 调用；默认主题也会解析出 colorPrimary 等 token。
const { token } = theme.useToken();
useAntdvTheme(token);
```

`useAntdvTheme` 接收 AntDV `theme.useToken()` 返回的解析后 `GlobalToken`，不接收 `AConfigProvider` 的 `theme` 配置对象。用户没有配置自定义主题时，AntDV 仍会解析默认 `colorPrimary` 等 token；切换算法或 token 时也会自动更新 Fn 变量。

Naive UI 项目在 `NConfigProvider` 子树内按需从独立入口导入 `useNaiveTheme()`。它通过 Naive UI 的 `useThemeVars()` 获取默认或当前覆盖后的 common token，并同步到 Fn；此入口依赖宿主项目已安装 `naive-ui`，不会被通用 Fn 入口自动加载：

```ts
import { useThemeVars } from "naive-ui";
import { useNaiveTheme } from "@certd/ui-client/components/table/theme/use-naive-theme";

const themeVars = useThemeVars();
useNaiveTheme(themeVars);
```

`useNaiveTheme` 接收 `useThemeVars()` 返回的解析后 common vars；Naive 自身的默认配置和 `NConfigProvider` 覆盖都会反映在其中。`DataTable` 独有的表头/单元格覆盖 token 不属于通用 theme vars；需要这类覆盖时，可继续用 `mapNaiveThemeToFnTokens({ common, DataTable })` 映射具体 overrides。
