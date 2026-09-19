# 贡献指南 Contributing

感谢你对 **上岸作战室 ShoreOps** 的兴趣！欢迎在 Issue / PR 中反馈问题与建议。

## 反馈问题

提交 Issue 时请尽量包含：

- 复现步骤、预期与实际表现；
- 浏览器 / 操作系统；
- 如涉及本地数据，可描述但**不要上传包含真实求职信息的截图或导出文件**。

## 本地开发

```powershell
# 前端
cd web
pnpm install
pnpm dev        # http://localhost:5173
pnpm test       # 单元测试

# 后端（可选）
cd ../server
pnpm install
pnpm start      # http://localhost:4000
```

## 提交规范

建议使用以下类型前缀：

- `feat:` 新功能
- `fix:` 缺陷修复
- `docs:` 文档
- `style:` 样式 / 格式
- `refactor:` 重构
- `test:` 测试
- `chore:` 构建 / 工程配置

## 安全相关

若发现安全漏洞，请**不要直接提交公开 Issue**，可通过仓库维护者提供的私下渠道联系。本项目默认 Local-First，业务数据不离开用户设备。
