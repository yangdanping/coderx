# 文档导航

维护日期：2026-10-25。运行与维护先查当前指南；历史计划保留设计背景，不作为待办清单。

## 当前指南

- [项目启动与环境配置](../README.md)、[环境模板](../.env.example)
- [Flow 能力、验收结论与未完成事项](../FLOW_RELEASE.md)
- [Flow 图片验收模板](../src/views/flow/test/flow-image-upload.e2e.md)：复制后记录新一轮结果，空勾选不表示功能未实现
- [状态管理职责](../src/stores/README.md)、[首页演示数据](../src/views/home/data/README.md)
- [3D 背景组件](../src/components/background/shape-3d/README.md)
- [后端启动、数据库与发布协议](https://github.com/yangdanping/coderx_server#readme)

## 历史与本地资料

- [Flow 历史验收与整理记录](./history/flow-2026-10.md)：首次上线、已删除工作分支、已解除 AI 阻塞
- `superpowers/plans/`、`superpowers/specs/`：带日期的设计和实施快照；旧命令、依赖版本、工作目录和未勾选步骤不能直接用于当前操作
- `.cursor/skills/coderx-raw-content-ops/`：本地原文采集操作 skill 及其设计资料；采集代码在后端，当前协议见后端 `CONTENT_INGEST.md`
- `verification/`、被忽略的 `HANDOFF*.md` 等：维护者本地证据和个人交接资料，不随克隆分发；不参与当前进度判断，也不因本轮整理而删除

日常从 `main` 获取当前代码。新的开发分支完成后可再整合；历史文档里的 `codex/*` 分支名不是长期存在的运行依赖。
