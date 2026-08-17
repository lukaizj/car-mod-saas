# Car Mod Studio — 3D 汽车改装平台

一个面向汽车改装门店的全栈 SaaS MVP：客户可以在浏览器中实时预览车漆、贴膜、拉花、轮毂和卡钳方案，自动生成报价并预约到店；门店可在后台统一处理预约。

![Car Mod Studio 3D 汽车改装配置器](public/screenshots/configurator.jpg)

## 项目亮点

- **多车型 3D 改装预览**：内置 BMW M4、Audi RS6、Tesla Model 3，React Three Fiber 实时渲染车漆与深色玻璃
- **自定义车型导入**：上传已打包纹理的 `.glb`，自动识别车漆 / 玻璃 / 轮毂 / 卡钳材质，支持手动勾选映射后保存
- **完整客户流程**：配置方案 → 自动报价 → 分享/截图 → 预约到店
- **门店管理后台**：查看预约、订单金额与客户方案，支持确认和取消
- **可信服务端定价**：服务端根据 Catalog 重建配置并计算报价，避免前端篡改价格
- **网页模型优化**：内置模型压缩与页面预加载，HDR 改本地程序化灯光

## 功能

- **C 端**：3D 配置器（换色/拉花、轮毂色、卡钳色、自定义 GLB）→ 分享/截图 → 报价明细 → 预约
- **B 端**：门店后台查看预约、确认订单
- **车型**：BMW M4 Competition · Audi RS6 Avant · Tesla Model 3 · 本地上传自定义 GLB
- **实时预览**：车漆颜色/质感、拉花（BMW）、轮毂颜色、卡钳颜色、玻璃暗化
- **数据**：SQLite + Prisma（MVP 本地开发）
- **安全**：预约配置由服务端 Catalog 重建并定价，Quote/Appointment 事务写入
- **桌面端**：基于 Electron 打包 macOS Apple Silicon 原生 App，支持离线数据持久化

## 桌面客户端下载

提供 macOS 原生客户端安装包：

- **最新版本**：[carmod 0.1.0](https://github.com/lukaizj/car-mod-saas/releases/tag/v0.1.0)
- **直接下载 DMG**：[carmod-0.1.0-arm64.dmg](https://github.com/lukaizj/car-mod-saas/releases/download/v0.1.0/carmod-0.1.0-arm64.dmg) (~559 MB)
- **SHA-256 校验和**：`b51d5aeb255429be8faa6bff11170718b7af86473bb235ff1b0b65d02dfcbe89`
- **在线下载页**：访问 `/download` 页面即可下载与查看安装指南

## 快速开始

```bash
git clone https://github.com/lukaizj/car-mod-saas.git
cd car-mod-saas
npm install
npm run db:setup    # 初始化数据库 + 种子门店
npm run dev         # http://localhost:3000
```

> `next dev` 首次访问会包含 Turbopack 按需编译时间。评估真实加载速度请使用 `npm run build && npm run start`。

## 页面

| 路径 | 说明 |
|------|------|
| `/` | 落地页 |
| `/download` | macOS 桌面客户端 (DMG) 下载页 |
| `/configure` | 3D 配置器 + 实时报价 |
| `/quote` | 报价明细 + 预约表单 |
| `/dashboard` | 门店后台 |

## 3D 模型

| 车型 | 运行时文件 | 说明 |
|------|------------|------|
| BMW M4 Competition | `public/models/bmw-m4.web.glb` | 原始 22.74 MB → 网页版约 3.89 MB；许可见 [`ATTRIBUTION.md`](public/models/ATTRIBUTION.md) |
| Audi RS6 Avant | `public/models/audi-rs6.web.glb` | 本地压缩模型，默认被 Git 忽略；许可见 [`AUDI_RS6_ATTRIBUTION.md`](public/models/AUDI_RS6_ATTRIBUTION.md) |
| Tesla Model 3 | `public/models/tesla-model3.web.glb` | 内置第三款演示车；来源与材质映射见 [`TESLA_MODEL3_ATTRIBUTION.md`](public/models/TESLA_MODEL3_ATTRIBUTION.md) |

HDR 环境光已改成本地程序化灯光，不再等待第三方资源。

重新生成优化模型（脚本不会覆盖原文件或已有输出）：

```bash
./scripts/optimize-model.sh public/models/bmw-m4.glb /tmp/bmw-m4.optimized.glb
./scripts/build-web-model.sh public/models/bmw-m4.glb /tmp/bmw-m4.web.glb
./scripts/build-rs6-web-model.sh /path/to/audi_rs6.glb public/models/audi-rs6.web.glb
```

> MVP 阶段：车身换色/材质、拉花、轮毂颜色、卡钳颜色已实时预览；车顶/引擎盖局部施工及轮毂款式、尾翼、包围为**报价 + 状态记录**，部件 swap 需后续在 Blender 中模块化导出。

### 上传自定义车型

在 `/configure` 的“自定义车型”区域填写车型名称并上传单文件 `.glb`（纹理需已打包，最大 80 MB）。模型写入本地 `public/models/uploads/`，该目录已被 Git 忽略。

导入后平台会按材质名称自动识别：

- 车漆：`body` / `paint` / `carpaint` / `primary` / `exterior` / `shell`
- 玻璃：`glass` / `window` / `windshield`
- 轮毂：`wheel` / `rim`
- 卡钳：`caliper` / `brake`

你可以勾选车漆材质、选择玻璃材质，确认后点击“保存车型设置”；也可稍后再次“编辑材质映射”。保存后会写入同目录 JSON 元数据。

当前上传存储面向本地开发/自托管 Node 环境。部署到 Vercel、Serverless 或多门店生产环境时，应将 `/api/models` 的文件写入替换为对象存储（S3 / R2 / OSS），并以数据库保存车型与门店归属。

## 技术栈

- Next.js 16 · React 19 · TypeScript · Tailwind CSS 4
- React Three Fiber · drei · Three.js
- Prisma · SQLite · Zustand

## 项目结构

```text
src/app/                  Next.js 页面与 API Routes
src/app/api/models/       自定义 GLB 上传与材质映射保存
src/components/           3D 配置器与业务组件
src/lib/                  Catalog、材质映射、报价和数据库逻辑
src/store/                Zustand 配置状态
prisma/                   数据模型、迁移与种子数据
public/models/            原始与网页优化后的 GLB 模型
scripts/                  可复现的模型压缩脚本
```

## 下一步

1. Blender 按 `body / roof / hood / wheels / spoiler / bodykit` 拆分并统一原点、轴向和命名
2. 为轮毂、尾翼、包围制作独立 GLB，接入真实部件 swap
3. 多租户（tenant_id）+ 门店鉴权 + 独立价表（上线前必做）
4. 微信通知 / PDF 报价单

## 作者

由 [@lukaizj](https://github.com/lukaizj) 开发和维护。

## 模型许可

演示车辆模型许可与署名请分别查看：

- [`public/models/ATTRIBUTION.md`](public/models/ATTRIBUTION.md) — BMW M4
- [`public/models/AUDI_RS6_ATTRIBUTION.md`](public/models/AUDI_RS6_ATTRIBUTION.md) — Audi RS6
- [`public/models/TESLA_MODEL3_ATTRIBUTION.md`](public/models/TESLA_MODEL3_ATTRIBUTION.md) — Tesla Model 3
