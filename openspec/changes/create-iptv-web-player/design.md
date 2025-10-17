## Context
为了构建一个现代、可维护且高性能的IPTV网页播放器，我们需要确定一个清晰、分离的架构和技术栈。

## Goals
- 建立一个前后端分离的应用架构。
- 前端注重用户体验和组件化。
- 后端注重性能、数据处理能力和API标准化。

## Decisions

### 1. 整体架构: 前后端分离
- **Decision**: 采用完全分离的前端和后端架构设计。前端是一个单页应用(SPA)，通过RESTful API与后端通信。
- **Rationale**: 提高灵活性和可扩展性，允许团队并行开发，并为未来的多客户端（如移动端）复用后端服务做好准备。

### 2. 前端技术栈
- **Framework**: **React (with TypeScript)**
  - **Rationale**: 强大的生态系统，成熟的组件化模型，TypeScript提供类型安全，是构建复杂应用的行业标准。
- **Video Player**: **Video.js**
  - **Rationale**: 提供稳定、可扩展的播放器解决方案，通过插件轻松支持HLS流媒体格式，并自带美观的UI控件。
- **Styling**: **Tailwind CSS**
  - **Rationale**: 提供高效的原子化CSS开发体验，能快速构建自定义、现代化的UI，且易于维护。

### 3. 后端技术栈
- **Runtime/Framework**: **Node.js (with TypeScript) + Fastify**
  - **Rationale**: Fastify提供比Express更高的性能，其基于JSON Schema的验证和序列化机制能构建更健壮的API。TypeScript保证了代码质量和可维护性。Node.js适合处理I/O密集型任务，如代理视频流或处理API请求。

## Risks / Trade-offs
- **Fastify vs. Express**: Fastify虽然性能更优，但其社区和中间件生态系统相比Express要小。对于本项目所需的核心功能（路由、数据验证、静态文件服务），Fastify的生态已足够成熟，性能优势大于生态劣势。
