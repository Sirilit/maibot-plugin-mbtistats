# Noto Sans SC 字体子集

MaiBot 的 `render.html2png` 用 `page.set_content` 加载 HTML，没有虚拟 origin 或 `page.route`，所以字体不能像旧 NoneBot 插件那样从模板目录按 URL 加载。这里把 Noto Sans CJK SC 的常用字子集以 WOFF2 形式随插件打包，由 `mbtistats/render.py` 以 `@font-face` data URI 内联进 HTML。

- 来源：旧 NoneBot 部署镜像里的 `fonts-noto-cjk`（Noto Sans CJK SC Regular / Bold）。
- 子集字符：`index.html`、`dashboard.bundle.js`、`styles.css`、`transform_render_data.py`、`analyze.py`、`plugin.py` 里出现的字符，加 GB2312 全集和常用标点。
- 生成命令（在字体文件所在目录）：

```bash
pyftsubset NotoSansCJKsc-Regular.otf \
  --text-file=chars.txt --flavor=woff2 \
  --output-file=NotoSansSC-Regular.woff2 \
  --layout-features='*' --glyph-names --symbol-cmap --legacy-cmap \
  --name-IDs='*' --name-languages='*'
```

Bold 同理。字符集之外的生僻字会回退到容器里的 WenQuanYi Zen Hei；要扩大覆盖范围，修改 `chars.txt` 后重新生成即可。

字体许可见 `OFL.txt`（SIL Open Font License 1.1）。
