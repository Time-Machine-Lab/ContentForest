# Xiaohongshu AI Product Posts Acceptance

采集时间：2026-05-20T00:00:00+08:00

## 采集结论

本环境已成功安装 `xiaohongshu-cli==0.6.4`，但无法完成 5 条 AI 产品相关小红书帖子的实采验收，因为 `xhs status --json` 返回 `not_authenticated`。Provider 按设计只做非交互式登录态检查，不会在 Agent 任务中触发二维码登录或读取/暴露 Cookie。

## 命令摘要

```powershell
python -m pip install --user xiaohongshu-cli==0.6.4
& "$env:APPDATA\Python\Python312\Scripts\xhs.exe" status --json
```

## CLI 状态

```json
{
  "ok": false,
  "schema_version": "1",
  "error": {
    "code": "not_authenticated",
    "message": "Status check failed: No 'a1' cookie found for xiaohongshu.com in any installed browser."
  }
}
```

## 帖子采集结果

未采集到可作为验收的 5 条帖子详情。缺失字段包括帖子标题、作者、封面、正文、点赞数、评论数和收藏数。

## 后续复测条件

1. 在本机浏览器登录 `https://www.xiaohongshu.com/`，或按 `xiaohongshu-cli` 文档执行 `xhs login --cookie-source <browser>` / `xhs login --qrcode`。
2. 将 `CONTENT_FOREST_XIAOHONGSHU_CLI_PATH` 指向本机 `xhs.exe` 完整路径，或把 Python Scripts 目录加入 PATH。
3. 重新执行小红书采集任务，期望输出 5 条 `complete_observed_case`，每条包含帖子详情和互动数据。
