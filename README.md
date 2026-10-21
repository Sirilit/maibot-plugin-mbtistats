# maibot-plugin-mbtistats

MaiBot 的 MBTI 群统计插件：读取群成员群名片/昵称里声明的 MBTI，更新本群历史快照，渲染带趋势图的看板，并把图片交给 AI 决定如何发送。

## 它和旧插件的区别

旧版是 NoneBot 的命令式插件：`/mbti` 直接取成员、直接出图、直接发送。  
新版分层：

- `mbti_stats` Tool：真正执行统计，返回文本 + `content_items` 图片；
- `/mbti` Command：**只给 AI 发送纯提醒**，让 AI 自己决定是否调用工具、怎么回复；如果 `announcement.enabled` 为真，提醒里会让 AI 发完图后调用 `send_announcement`，公告内容和每日统计一致。
- `/mbti-debug` / `/mbti_debug` Command：确定性调试入口，直接出图发送；执行后把“已执行”事件写回 Maisaka 上下文，让 AI 知道这次是调试命令触发的。该命令由 `[debug].enabled` 控制，默认关闭。
- `send_announcement` Tool：把项目公告以**合并转发**消息发到当前聊天；开头标题、GitHub、开发者由代码写死，正文来自 `[announcement].extra`，AI 不需要改写。

这样正常路径由 AI 手操；调试/降级路径不经过 AI 决策，但会留下 AI 可见的上下文痕迹。

## 目录

```text
_manifest.json            # Manifest v2，含 capabilities
config.toml               # 运行时配置（[plugin] / [daily] / [announcement] / [render] / [debug]）
plugin.py                 # 入口：@Tool、@Command、数据、并发、定时
mbtistats/
  analyze.py              # 昵称 -> MBTI 类型/特质统计（纯函数）
  transform_render_data.py# 历史快照 -> 前端渲染数据
  render.py               # 单文件 HTML 构建（CSS/JS/ECharts/图片/JSON 全内联）
  config.py               # PluginConfigBase 配置模型
  assets/
    fonts/                # Noto Sans CJK SC 子集（WOFF2），render.py 内联为 @font-face
    images/               # 人格图片
    template/             # index.html / styles.css / ECharts / dashboard bundle
scripts/
  debug_frontend.py       # 浏览器预览：生成 debug/preview.html
```

## 配置

`config.toml` 由 Host/WebUI 管理，核心字段：

```toml
[plugin]
config_version = "0.3.0"
enabled = true

[daily]
enabled = true
hour = 0
minute = 0
group_ids = ["639990875", "1075254868"]

[announcement]
enabled = true
# 开头标题、GitHub、开发者由代码写死；空行会拆成合并转发的多条消息
extra = """一个小新闻（）
...（完整正文见 config.toml）"""

[render]
timeout_ms = 30000
viewport_width = 1050
viewport_height = 1000
queue_wait_seconds = 20.0

[debug]
enabled = false
```

- `daily.enabled` 当前为 `true`（默认 `false`）；打开后每天到点通过 `ctx.maisaka.proactive.trigger` 提醒 AI，AI 再决定是否调用 `mbti_stats`。如果 `announcement.enabled` 为真，每日统计的 intent 会要求 AI 发完图后调用 `send_announcement`。
- `announcement.enabled` 控制是否允许发送项目公告；公告开头三行（标题、GitHub、开发者）写死在 `plugin.py` 的 `_ANNOUNCEMENT_HEADER`，后面的正文在 `announcement.extra`。
- `announcement.extra` 里的空行会拆成合并转发里的多条消息；在群里看到的是一条可展开的转发记录，不是一堵长文字。
- `debug.enabled` 默认关闭；打开后才允许 `/mbti-debug` / `/mbti_debug` 直接出图。
- `queue_wait_seconds` 是异群并发时的等待上限；超时 Tool 返回 `busy=true`，不会无限阻塞到 60 秒 RPC 超时。
- `config_version` 是 SDK 的配置 schema 版本，不要手改。

## 运行时约定

- **群成员接口**：`adapter.snowluma.group.get_group_member_list`（NapCat 适配器同别名），字段 `user_id` / `nickname` / `card`。统计时把 `card` 和 `nickname` 合在一起扫描，同一个人只计一次。
- **数据目录**：`ctx.paths.data_dir/v1/{group_id}/stats-data.json`。仓库不提交群历史数据（`mbtistats/assets/data/` 已 ignore）；部署机需要种子历史时，把 `v1/` 放到插件的 `mbtistats/assets/data/`，或直接放到 `ctx.paths.data_dir/v1/`。首次加载只有在目标不存在且种子源存在时才复制。
- **渲染**：`ctx.render.html2png` 的底层是 `page.set_content`，没有虚拟 origin 或 `page.route`。因此 `render.py` 把 CSS、ECharts、图片 base64、JSON 全部内联成单文件 HTML；`allow_network=False` 也能完整出图。
- **并发**：全局一个渲染锁；同群请求用 `_inflight` 合并为一个任务；异群最多等 `queue_wait_seconds`，超时返回 busy。禁止多个 MBTI 渲染同时跑。
- **宿主浏览器**：容器内已安装 Playwright Chromium 到 `/MaiMBot/data/playwright-browsers`（挂载到宿主机 `data/playwright-browsers`），重启容器后仍可用。若换机器部署，需要先执行一次 `python -m playwright install chromium`，并把浏览器放到该目录或让渲染服务自动下载。
- **字体**：`mbtistats/assets/fonts/` 里是 Noto Sans CJK SC 的 Regular/Bold 子集（WOFF2），`render.py` 以 `@font-face` data URI 内联进 HTML。旧 NoneBot 镜像是靠 `fonts-noto-cjk` 系统字体；MaiBot 镜像只有文泉驿，所以之前会回退成文泉驿。字体子集把 HTML 从约 2MB 推到约 9MB，仍在插件 RPC 的单帧 16MB 限制内；渲染实测约 5 秒。

- **定时任务**：`_daily_loop` 只负责到点 `proactive.trigger`；不做独立的倒计时提醒。
- **公告入口**：每日统计和 `/mbti` 都会在统计图之后让 AI 调用 `send_announcement`；`/mbti-debug` 不调用。工具用 `ctx.send.forward` 发合并转发，开头三行写死在代码里，正文来自 `[announcement].extra`；合并转发失败时退回发送纯文本。
- **美术可视化**：16 人格代表物件的分布图方案见 `docs/mbti-object-visualization.md`（待美术合作和素材）。

## 前端源码与构建

看板的 CSS/HTML 仍是 `mbtistats/assets/template/mbti-stats/` 下的独立文件；JS 的拆分源码在 `frontend/src/*.mjs`，由 esbuild 打成运行时用的 `dashboard.bundle.js`。改前端时只改 `frontend/src/`，然后：

```bash
cd frontend
pnpm install
pnpm build
```

不要直接手改 `dashboard.bundle.js`。运行时仍然由 `render.py` 把 CSS/JS/图片/数据内联成单文件 HTML，这是 MaiBot `ctx.render.html2png`（`page.set_content`，没有虚拟 origin）的限制；源码层面保持拆分。

## 浏览器预览

```bash
# 用真实历史数据生成单文件页面
python scripts/debug_frontend.py --group 639990875

# 起一个本地静态服务器（端口不要和 diagrams 的 8814 撞）
python -m http.server 8821 --directory debug

# 打开 http://127.0.0.1:8821/preview.html
```

预览和宿主渲染共用同一个 `build_html()`；预览里图表正常，宿主截图就不会因为资源加载失败而空白。

## 本地开发

插件运行在 MaiBot Host/Runner 子进程里，运行时不需要 `.venv`。仓库里的 `.venv` 只用于 IDE 补全和纯函数测试：

```bash
uv venv --python 3.13 .venv
uv pip install maibot-plugin-sdk==2.12.0
```

容器内检查：

```bash
docker exec mbtistats-maibot-core python -m py_compile /MaiMBot/plugins/mbtistats/plugin.py
docker logs -f mbtistats-maibot-core
```

## 迁移来源

旧仓库：<https://github.com/Siridelta/nonebot-plugin-mbtistats>

原插件由 **Sirilit** 与 **AllayFocalors（玛画疼）** 合作开发；迁移到 MaiBot 时保留原有统计逻辑、历史数据和署名。

## 已知边界

- 只支持群聊；私聊里没有群成员列表，Tool 会拒绝。
- 统计只看群名片/QQ 昵称里的显式 MBTI 声明，不做画像猜测。
- 共享消息组只共享长期记忆/表达/黑话，不共享原始聊天消息；跨群原始消息需要另写桥接插件。
- `/mbti` 只负责提醒 AI；确定性降级入口是 `/mbti-debug` / `/mbti_debug`，且默认关闭。
- `/mbti-debug` 执行完会把结果摘要写回 Maisaka 上下文；AI 之后的回复能看到这次调试已经发生过。
