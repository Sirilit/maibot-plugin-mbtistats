# maibot-plugin-mbtistats

MaiBot 的 MBTI 群统计插件：读取群成员群名片/昵称里声明的 MBTI，更新本群历史快照，渲染带趋势图的看板。

它有两种运行模式：

- **AI 处理群**：AI 决定怎么回复、什么时候发图，公告由 AI 调用固定工具发送；
- **自动处理群**：`/mbti` 直接出图，不经过 AI；公告由插件确定性发送。

自动处理群和 AI 处理群共用同一套统计、历史数据和渲染逻辑，区别只在入口和消息是否经过 AI。

> 本仓库只有 `maibot-plugin-mbtistats` 本身。自动处理群的其他消息是否进入 AI，不由本插件控制；需要额外配合外部 gate 插件。

---

## 目录

- [功能](#功能)
- [两种处理群](#两种处理群)
- [快速开始](#快速开始)
- [命令与行为](#命令与行为)
- [配置](#配置)
- [每日统计](#每日统计)
- [自动处理群](#自动处理群)
- [数据与渲染](#数据与渲染)
- [前端源码](#前端源码)
- [本地预览](#本地预览)
- [开发与验证](#开发与验证)
- [常见问题](#常见问题)
- [已知边界](#已知边界)
- [迁移与署名](#迁移与署名)
- [License](#license)

## 功能

- 从群名片和 QQ 昵称里识别显式 MBTI 声明，同一个人只计一次；
- 统计 16 型分布、四组维度（EI / SN / TF / JP）和两端特质；
- 按群保存历史快照，生成类型/特质历史表和趋势图；
- 输出带字体、图片、ECharts 的单文件看板；
- 支持 `/mbti`、`/mbti-debug`、每日定时统计；
- 支持 AI 处理群和自动处理群混合运行；
- 自动处理群除了出图，还可以按配置发送“AI 未启用”提示和项目公告。

## 两种处理群

本插件用 `[access].ai_group_ids` 区分两种群：

- **AI 处理群**：在列表中，消息由 AI 正常处理；
- **自动处理群**：不在列表中，`/mbti` 和每日统计由插件直接处理。

“自动处理群”是本插件的处理模式，不等于“已经关闭 AI”。本插件只负责：

- `/mbti`、`/mbti-debug` 的直接处理和输出；
- 每日统计的直接处理和输出；
- 这些输出不写入 Maisaka 上下文。

**其他消息会不会进入 AI，不由本插件决定。** 如果没有外部 gate 插件，AI 仍会在这些群里运行，其他消息仍可能建立上下文并触发回复。需要完整隔离时，你可以另外自制一个 gate 插件：它在 `chat.receive.before_process` 处按群中止消息，且它的 AI 群列表要和本插件的 `[access].ai_group_ids` 保持一致。

没有 gate 时的实际效果：

- AI 机器人仍然在群里运转；
- `/mbti` 由本插件直接处理，AI 不会看到这次统计指令的执行过程；
- 其他消息仍可能进入 AI 上下文，并可能被 AI 回复。

## 快速开始

### 环境

- MaiBot 1.3.x；
- `maibot-plugin-sdk` 2.x；
- SnowLuma 或 NapCat 适配器；
- Host 端可用的 Playwright Chromium。

### 安装插件

把本仓库挂到 MaiBot 的 `plugins` 目录：

```yaml
volumes:
  - ../maibot-plugin-mbtistats:/MaiMBot/plugins/mbtistats
```

如果另装了 gate 插件，再单独挂载 gate；不要把整个 `plugins` 目录覆盖镜像内置插件。

### 安装渲染浏览器

首次部署时，在容器内安装 Chromium：

```bash
docker exec -e PLAYWRIGHT_BROWSERS_PATH=/MaiMBot/data/playwright-browsers \
  mbtistats-maibot-core python -m playwright install chromium
```

把浏览器放到挂载的 `data/playwright-browsers` 后，重启容器仍然可用。

### 配置

`config.toml` 是运行时配置，已被 gitignore；首次加载时 Host 会按代码默认值生成。部署时重点检查：

1. `[access].ai_group_ids`；
2. `[announcement]` 的正文和提示开关；
3. `[daily]` 的 `mode` 与 `group_ids`；
4. `adapter_policy.toml` 是否允许群消息进入 Host。

### 适配器策略

`adapter_policy.toml` 是消息进入 Host 前的整群过滤。自动处理群的 `/mbti` 也需要消息先到达插件，所以群聊必须允许进入 Host：

```toml
[adapters.group]
default_action = "allow"
```

如果这里把自动处理群整个 `block` 掉，`/mbti` 也到不了插件。

## 命令与行为

| 入口 | AI 处理群 | 自动处理群 |
|---|---|---|
| `/mbti` | 给 AI 发一条提醒，由 AI 调用 `mbti_stats` 并决定怎么发 | 直接统计、出图、发送；不经过 AI |
| `/mbti-debug` / `/mbti_debug` | 直接出图；执行后把“已执行”写回 Maisaka 上下文 | 直接出图；不写 AI 上下文 |
| 每日统计 | 到点触发 AI，AI 调用 `mbti_stats` 并发公告 | 到点直接出图，不经过 AI |
| `mbti_stats` Tool | AI 可调用，返回文本 + 图片 content item | 不使用（没有 AI 决策） |
| `send_announcement` Tool | AI 发完图后调用，发送合并转发公告 | 不使用；插件直接发固定公告 |

### 自动处理群的发送顺序

自动处理群在 `/mbti` 和每日统计中，发送顺序固定为：

1. 统计图；
2. 可选的 `[announcement].stats_only_notice` 提示；
3. 合并转发的项目公告。

提示和公告都不会写入 Maisaka 历史上下文。

- `announcement.stats_only_notice_enabled = false`：不发送提示；
- `announcement.enabled = false`：不发送公告；
- 两个开关互相独立，可以只发提示、只发公告，或都不发。

## 配置

### `config.toml`

```toml
[plugin]
config_version = "0.7.0"
enabled = true

[access]
# AI 处理群；不在列表里的群进入自动处理模式
ai_group_ids = ["123456789", "987654321"]

[daily]
enabled = true
hour = 0
minute = 0
# whitelist：只统计 group_ids；blacklist：统计所有已加入群，排除 group_ids
mode = "whitelist"
group_ids = ["123456789", "987654321"]

[announcement]
enabled = true
# 开头标题、GitHub、开发者由代码写死；空行会拆成合并转发的多条消息
extra = """一个小新闻（）
...（完整正文见 config.toml）"""
# 是否发送“AI 未启用”提示；与公告开关独立
stats_only_notice_enabled = false
# 提示文案；留空则即使开关打开也不发
stats_only_notice = "（为了节省 token 消耗，AI 功能在本群暂不可用，如有需要请联系开发者）"

[render]
timeout_ms = 30000
viewport_width = 1050
viewport_height = 1000
queue_wait_seconds = 20.0

[debug]
enabled = false
```

字段说明：

| 字段 | 作用 |
|---|---|
| `access.ai_group_ids` | AI 处理群白名单；列表之外的群进入自动处理模式。留空表示所有群都进入自动处理模式。 |
| `daily.mode` | `whitelist` 只统计 `group_ids`；`blacklist` 统计 SnowLuma 返回的所有已加入群，排除 `group_ids`。 |
| `daily.group_ids` | 按 `daily.mode` 解释的群号列表；`blacklist` 留空表示所有已加入群。 |
| `announcement.enabled` | 是否发送项目公告。 |
| `announcement.stats_only_notice_enabled` | 是否在自动处理群发图后发送“AI 未启用”提示；与公告开关独立。 |
| `announcement.stats_only_notice` | 提示文案；留空则即使开关打开也不发。 |
| `announcement.extra` | 公告正文；空行拆成合并转发的节点。 |
| `render.queue_wait_seconds` | 异群渲染并发时的等待上限。 |
| `debug.enabled` | 是否启用 `/mbti-debug` / `/mbti_debug`。 |
| `config_version` | 配置 schema 版本，不要手改。 |

> 配置键名沿用 `ai_group_ids` 和 `stats_only_notice`；它们分别对应“AI 处理群”和“自动处理群提示”。

## 每日统计

`daily` 只有一次每日调度，不做独立的倒计时提醒。

### 白名单

只统计指定群：

```toml
[daily]
mode = "whitelist"
group_ids = ["123456789", "987654321"]
```

### 黑名单

统计所有已加入群，排除指定群：

```toml
[daily]
mode = "blacklist"
group_ids = ["111111111"]
```

黑名单通过 SnowLuma/NapCat 的 `adapter.snowluma.group.get_group_list` 获取群列表，不依赖群消息。因此即使某个群被外部 gate 掉、从未给 AI 发过消息，也能被发现并统计。

- 黑名单留空：统计所有已加入群；
- 黑名单列出群号：统计这些群以外的所有群；
- 白名单列出群号：只统计这些群。

## 自动处理群

自动处理群的目标是：保留 `/mbti`，并让这次统计的输入命令和输出消息不进入 AI 上下文。

本插件负责的行为：

```text
/mbti 或每日统计
  -> 插件直接调用 _get_stats
  -> 渲染图片
  -> ctx.send.image(sync_to_maisaka_history=False)
  -> 可选提示（sync_to_maisaka_history=False）
  -> 可选合并转发公告（sync_to_maisaka_history=False）
```

### 上下文边界

- **统计命令输入**：为了路由到插件，MaiBot 主链会登记一条命令记录，但不会进入 AI 上下文；
- **输出图片**：`sync_to_maisaka_history=False`，不写入 Maisaka 上下文；
- **输出提示**：`sync_to_maisaka_history=False`；
- **输出公告**：合并转发和文本兜底都 `sync_to_maisaka_history=False`；
- **其他输入消息**：本插件不拦截；如果装了外部 gate，由 gate 决定；没有 gate 时，它们仍可能进入 AI。

所以准确的说法是：**本插件保证 `/mbti` 在自动处理群里不进入 AI 上下文，输出也不进入；普通聊天是否进入，不由本插件保证。**

### 没有 gate 时

没有 gate 时，AI 仍在群里运转。`/mbti` 由本插件直接处理，AI 不会看到这次统计指令的执行过程，也不会收到统计结果的上下文；但其他消息仍可能进入 AI 并被回复。

## 数据与渲染

### 数据目录

每个群独立保存：

```text
ctx.paths.data_dir/v1/<group_id>/stats-data.json
```

仓库不提交群历史数据，`mbtistats/assets/data/` 已 ignore。部署机需要种子历史时，可以把 `v1/` 放到插件的 `mbtistats/assets/data/`，或直接放到 `ctx.paths.data_dir/v1/`；首次加载只有在目标不存在且种子源存在时才复制。

### 渲染

`ctx.render.html2png` 的底层是 Playwright `page.set_content`，没有虚拟 origin 或 `page.route`。因此 `render.py` 把以下资源全部内联成一个 HTML：

- CSS；
- ECharts；
- 人格图片 base64；
- 看板 JSON；
- Noto Sans CJK SC 字体子集（WOFF2，`@font-face` data URI）。

`allow_network=False` 也能完整出图。字体子集让 HTML 从约 2MB 增加到约 9MB，仍在插件 RPC 单帧 16MB 限制内；实测渲染约 5 秒。

### 并发

- 全局一个渲染锁；
- 同群请求用 `_inflight` 合并为一个任务；
- 异群最多等 `render.queue_wait_seconds`，超时 Tool 返回 `busy=true`；
- 不允许多个 MBTI 渲染同时抢 CPU，也不允许同群并发写历史。

## 前端源码

看板的 HTML/CSS 在 `mbtistats/assets/template/mbti-stats/`；JS 的拆分源码在 `frontend/src/*.mjs`。

改前端时只改 `frontend/src/`，然后构建：

```bash
cd frontend
pnpm install
pnpm build
```

构建产物是 `mbtistats/assets/template/mbti-stats/dashboard.bundle.js`。不要直接手改这个 bundle。

运行时仍然由 `render.py` 把 CSS/JS/图片/数据内联成单文件 HTML，这是 `page.set_content` 的限制；源码层面保持拆分。

## 本地预览

```bash
# 用真实历史数据生成单文件页面
python scripts/debug_frontend.py --group 123456789

# 起一个本地静态服务器
python -m http.server 8821 --directory debug

# 打开 http://127.0.0.1:8821/preview.html
```

预览和宿主渲染共用同一个 `build_html()`；预览里图表正常，宿主截图就不会因为资源加载失败而空白。

## 开发与验证

插件运行在 MaiBot Host/Runner 子进程里，运行时不需要仓库里的 `.venv`。仓库里的 `.venv` 只用于 IDE 补全和纯函数测试：

```bash
uv venv --python 3.13 .venv
uv pip install maibot-plugin-sdk==2.12.0
```

容器内检查：

```bash
docker exec mbtistats-maibot-core python -m py_compile /MaiMBot/plugins/mbtistats/plugin.py
docker logs -f mbtistats-maibot-core
```

重载本插件可以用内置插件管理命令（operator 权限）：

```text
/pm plugin reload sirilit.mbtistats
```

如果另外装了 gate，gate 不需要跟着本插件重载；但不要把 gate 禁用，否则自动处理群会重新落回 AI 处理链。

## 常见问题

### 中文字体回退成文泉驿

MaiBot 镜像默认没有 Noto CJK。项目已经把 Noto Sans CJK SC 子集放在 `mbtistats/assets/fonts/`，并在 `render.py` 里以 data URI 内联。不要依赖容器的系统字体。

### 群里同时出现合并转发和纯文本公告

`ctx.send.forward(..., return_details=True)` 的 SDK 返回是 `{"sent": true, ...}`，不是 `success`。代码按 `sent` 判断，只有失败才走文本兜底。

### `/mbti` 返回 busy

同一个时刻只允许一个 MBTI 渲染。异群请求等待超过 `queue_wait_seconds` 后返回 `busy=true`，不要当成统计失败。

### 自动处理群没有公告

检查：

1. `announcement.enabled` 是否为 `true`；
2. `announcement.stats_only_notice_enabled` 是否打开（这只影响提示，不影响公告）；
3. 是否走的是自动处理群的 `/mbti` 或每日统计；`/mbti-debug` 不发公告。

### 自动处理群仍然触发了 AI

本插件不是消息门闩。如果没有外部 gate，其他消息仍会进入 AI，这是预期行为；要隔离其他消息，需要安装 gate，并让 gate 的 AI 群列表与本插件一致。

## 已知边界

- 只支持群聊；私聊没有群成员列表，统计会拒绝。
- 统计只看群名片/QQ 昵称里的显式 MBTI 声明，不做画像猜测。
- 自动处理群仍需要适配器能收到群消息；`adapter_policy.toml` 不能把群整个 block 掉，否则 `/mbti` 也收不到。
- 本插件不拦截其他消息；没有外部 gate 时，AI 仍会在自动处理群里运转，其他消息仍可能进入上下文并被回复。
- `/mbti-debug` 在 AI 处理群执行完会把“已执行”写回 Maisaka 上下文；自动处理群不写。
- 共享消息组只共享长期记忆/表达/黑话，不共享原始聊天消息；跨群原始消息需要另写桥接插件。
- 一个群只应挂一个统计 bot；两个 bot 同群会重复统计、重复回复。双 bot 处理不同群时，不要共享同一个 data 目录并发写。

## 迁移与署名

旧仓库：<https://github.com/Siridelta/nonebot-plugin-mbtistats>

原插件由 **Sirilit** 与 **AllayFocalors（玛画疼）** 合作开发；迁移到 MaiBot 时保留原有统计逻辑、历史数据和署名。

## License

MIT
