# 多功能文件工具箱 - 使用说明

这个项目是一个本地可运行的文件工具箱，包含：

- 图片压缩
- 在线解压（ZIP / RAR / 7z）
- 在线压缩包（文件/文件夹打包为 ZIP / 7Z）

## 1. 安装与启动

### 安装依赖

```bash
npm ci
```

### 启动开发环境

```bash
npm run dev
```

打开浏览器访问：

- `http://localhost:3000`

如果想用 3001 端口：

```bash
npm run dev -- -p 3001
```

## 2. 功能使用

### 图片压缩

入口：`/tools/image-compressor`

使用步骤：

1. 上传一张或多张图片
2. 设置体积、质量、分辨率参数
3. 点击压缩并下载结果

---

### 在线解压

入口：`/tools/archive-extractor`

使用步骤：

1. 上传压缩包（ZIP / RAR / 7z）
2. 如有密码，在输入框填写密码
3. 查看目录、预览文件、勾选需要的文件
4. 点击导出勾选项下载 ZIP

---

### 在线压缩包

入口：`/tools/archive-compressor`

使用步骤：

1. 选择文件或选择文件夹
2. 选择输出格式（ZIP 或 7Z）
3. 输入输出文件名
4. 点击开始压缩并下载

## 3. 打包 Windows 免安装版（.exe）

执行：

```bash
npm run dist:win-unpacked
```

输出目录：

- `dist-electron/FileToolbox-win32-x64`

运行文件：

- `dist-electron/FileToolbox-win32-x64/FileToolbox.exe`

## 4. 常用命令

```bash
npm run lint
npm run test
npm run build
npm start
```

