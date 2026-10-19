# maibot-plugin-mbtistats

MaiBot 的 MBTI 群统计插件。当前是**可加载的骨架**：

- `_manifest.json` 已按 Manifest v2 填好；
- `plugin.py` 可以被 MaiBot 加载；
- `/mbti` 命令会回一句“骨架已加载”；
- `mbti_stats` Tool 已注册，但内部还是占位。

## 目录

```text
_manifest.json
plugin.py                 # MaiBot 入口；@Tool + @Command
mbtistats/
  analyze.py              # 从旧插件搬分析逻辑
  render.py               # 生成 HTML；图片由 ctx.render 出
  transform_render_data.py
  config.py               # PluginConfigBase 配置模型（可选）
  assets/                 # 静态模板/资源
```

## 迁移来源

旧仓库：<https://github.com/Siridelta/nonebot-plugin-mbtistats>

对应关系：

- `analyze.py` → `mbtistats/analyze.py`
- `transform_render_data.py` → `mbtistats/transform_render_data.py`
- `render.py` → `mbtistats/render.py`，但不要自己起 Playwright；
  用 `self.ctx.render.html2png(html, ...)`。
- `get_group_data.py` → `self.ctx.api.call("adapter.napcat.group.get_group_member_list", ...)`
- `config.py` → `PluginConfigBase` + `Field`
- `__init__.py` 的 NoneBot 命令/定时任务 → `plugin.py` 的 `@Command` / `@Tool` / 定时逻辑

不要 import NoneBot，也不要 import `src.*`；所有宿主能力走 `self.ctx`。

## 开发步骤

1. 搬 `analyze.py` / `transform_render_data.py`，先做成不依赖 NoneBot 的纯函数。
2. 在 `plugin.py` 的 `mbti_stats` 里取群成员，调用分析层。
3. 用 `ctx.render.html2png` 出图，`ctx.send.image` 发送；如果希望 AI 决定是否发图，
   把图片作为 Tool 结果的 `content_items` 返回，让 AI 用 reply 附加。
4. 给 `_manifest.json` 补 `capabilities`（如 `send.image`）和
   `dependencies`（Python 包），Host 会处理依赖。
5. 用 `/mbti` 做确定性测试；用自然语言触发 `mbti_stats` 测 AI 路径。

## 本地加载

把整个目录放到 MaiBot 的 `plugins/mbtistats`，或在 Docker 里挂载：

```yaml
- ../maibot-plugin-mbtistats:/MaiMBot/plugins/mbtistats
```

修改 `plugin.py` 后 MaiBot 会自动热重载；不生效就重启 core。

## 数据

持久数据用：

```python
self.ctx.paths.data_dir
```

默认映射到 `data/plugins/<plugin_id>/`，不要写死插件源码目录。
