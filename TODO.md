# Port checklist

- [ ] 把 analyze.py 改成纯函数，不 import nonebot
- [ ] 把 transform_render_data.py 搬过来
- [ ] 把 render.py 改成 build_html，图片交给 ctx.render.html2png
- [ ] get_group_data 改成 ctx.api.call("adapter.napcat.group.get_group_member_list", ...)
- [ ] 群成员统计接到 mbti_stats Tool
- [ ] /mbti Command 和 Tool 共用同一套逻辑
- [ ] 需要发图时给 manifest 加 send.image / render.html2png 能力
- [ ] 需要额外 Python 包时写进 manifest dependencies
- [ ] 用 Docker 里的 MaiBot 实测 /mbti 和自然语言触发
