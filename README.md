# 多功能文件工具箱（FileBox）

一个基于 Next.js + Electron 的本地文件处理工具箱，聚焦常用高频场景：图片压缩、压缩包解压与打包。

## 功能特性

- 图片压缩：支持多图上传，按质量/尺寸进行压缩后下载
- 压缩包解压：支持 `ZIP / RAR / 7z`，可按需勾选文件导出
- 压缩包打包：支持文件/文件夹打包为 `ZIP / 7Z`
- 本地优先：可在浏览器开发模式运行，也可打包为 Windows 桌面版

## 技术栈

- 前端框架：`Next.js 14` + `React 18` + `TypeScript`
- 桌面封装：`Electron`
- UI：`Tailwind CSS` + `Radix UI`
- 测试：`Vitest` + `Playwright`

## 快速开始

### 1) 安装依赖

```bash
npm ci
```

### 2) 启动开发环境

默认端口 `3000`：

```bash
npm run dev
```

自定义到 `3001`：

```bash
npm run dev:3001
```

访问地址：

- `http://localhost:3000`
- 或 `http://localhost:3001`

## 功能入口与使用

### 图片压缩

- 入口：`/tools/image-compressor`
- 步骤：上传图片 -> 调整参数 -> 执行压缩 -> 下载结果

### 压缩包解压

- 入口：`/tools/archive-extractor`
- 支持：`ZIP / RAR / 7z`（含密码包）
- 步骤：上传压缩包 -> 输入密码（如有）-> 勾选需要文件 -> 导出 ZIP

### 压缩包打包

- 入口：`/tools/archive-compressor`
- 步骤：选择文件/文件夹 -> 选择格式（ZIP/7Z）-> 设置输出名 -> 开始打包

## 打包为 Windows 桌面版

执行以下命令生成免安装目录版：

```bash
npm run dist:win-unpacked
```

产物目录：

- `dist-electron/FileToolbox-win32-x64`

启动文件：

- `dist-electron/FileToolbox-win32-x64/FileToolbox.exe`

## 常用命令

```bash
# 开发
npm run dev
npm run dev:3001

# 构建与启动
npm run build
npm run start
npm run start:3001

# 代码质量与测试
npm run lint
npm run test
npm run test:e2e
```

## 项目结构（简要）

```text
app/                # 路由与页面
components/         # 业务组件与通用 UI 组件
lib/                # 工具函数与核心处理逻辑
electron/           # Electron 主进程与打包准备脚本
tests/              # 单测与 E2E 测试
```

## Star History

<a href="https://www.star-history.com/?type=date&repos=EvoMap%2Fevolver">
 <picture>
   <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/chart?repos=EvoMap/evolver&type=date&theme=dark&legend=top-left" />
   <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/chart?repos=EvoMap/evolver&type=date&legend=top-left" />
   <img alt="Star History Chart" src="https://api.star-history.com/chart?repos=EvoMap/evolver&type=date&legend=top-left" />
 </picture>
</a>

## 开源许可

本项目采用 `Apache-2.0` 许可证，详见 `LICENSE`。

