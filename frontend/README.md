# Dashboard 前端源码

这里放 MBTI 看板的拆分源码，构建产物是 `../mbtistats/assets/template/mbti-stats/dashboard.bundle.js`。运行时的 HTML 仍然由 `render.py` 把 CSS/JS 内联成单文件（MaiBot 的 `ctx.render.html2png` 用 `page.set_content`，没有虚拟 origin），但**人改代码只改这里**。

```text
src/
  scripts.mjs          # 入口：setupCharts()
  dashboard-class.mjs  # 看板类、通用图表初始化
  top-personality.mjs  # 顶部第一名
  type-summary.mjs     # 16 类型饼图/条形图
  trend-charts.mjs     # 周/月/年/全历史趋势图
  trait-pies.mjs       # 4 特质饼图
```

构建：

```bash
cd frontend
pnpm install   # 首次，装 esbuild；若提示 ignored build scripts，先 pnpm approve-builds
pnpm build
```

`pnpm build` 会生成 `dashboard.bundle.js`，插件重新加载后使用新 bundle。改完源码不要直接手改 bundle。
