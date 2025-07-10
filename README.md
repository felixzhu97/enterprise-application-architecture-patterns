# 企业应用架构模式完整案例

这是一个基于《企业应用架构模式》（Patterns of Enterprise Application Architecture）一书的完整实现案例，通过构建一个在线商城系统来演示各种企业级架构模式。

## 系统概述

本案例实现了一个电商平台，包含以下核心功能：

- 用户管理和身份认证
- 商品目录管理
- 订单处理
- 库存管理
- 支付处理
- 优惠券系统

## 实现的架构模式

### 领域层模式 (Domain Logic Patterns)

- **Domain Model（领域模型）**: 复杂业务逻辑的对象模型
- **Active Record（活动记录）**: 简单的数据访问逻辑
- **Table Module（表模块）**: 数据库表的业务逻辑

### 数据源架构模式 (Data Source Architectural Patterns)

- **Data Mapper（数据映射器）**: 对象与数据库的映射分离
- **Table Data Gateway（表数据网关）**: 数据库表访问的单一入口
- **Row Data Gateway（行数据网关）**: 数据库行的对象表示

### 对象关系行为模式 (Object-Relational Behavioral Patterns)

- **Unit of Work（工作单元）**: 事务边界管理
- **Identity Map（身份映射）**: 对象身份保证
- **Lazy Load（延迟加载）**: 按需加载关联数据

### 对象关系结构模式 (Object-Relational Structural Patterns)

- **Identity Field（身份字段）**: 对象标识管理
- **Foreign Key Mapping（外键映射）**: 对象关联映射
- **Association Table Mapping（关联表映射）**: 多对多关系映射

### Web 表现模式 (Web Presentation Patterns)

- **Model View Controller（MVC）**: 表现层架构
- **Page Controller（页面控制器）**: 单页面请求处理
- **Front Controller（前端控制器）**: 集中式请求处理
- **Template View（模板视图）**: 模板化页面渲染

### 分布式模式 (Distribution Patterns)

- **Remote Facade（远程外观）**: 远程接口简化
- **Data Transfer Object（数据传输对象）**: 数据传输封装

### 离线并发模式 (Offline Concurrency Patterns)

- **Optimistic Offline Lock（乐观离线锁）**: 乐观并发控制
- **Pessimistic Offline Lock（悲观离线锁）**: 悲观并发控制

### 会话状态模式 (Session State Patterns)

- **Client Session State（客户端会话状态）**: 客户端状态管理
- **Server Session State（服务器会话状态）**: 服务器端状态管理
- **Database Session State（数据库会话状态）**: 数据库状态存储

### 基础模式 (Base Patterns)

- **Gateway（网关）**: 外部系统访问封装
- **Mapper（映射器）**: 数据转换逻辑
- **Layer Supertype（层超类型）**: 层次化类型定义
- **Separated Interface（分离接口）**: 接口与实现分离

## 技术栈

- **Runtime**: Node.js 18+
- **Language**: TypeScript 5.0+
- **Database**: PostgreSQL + Redis
- **Web Framework**: Express.js
- **ORM**: TypeORM (演示 Data Mapper 模式)
- **Testing**: Jest
- **Documentation**: TypeDoc

## 项目结构

```
src/
├── domain/                 # 领域层
│   ├── model/             # 领域模型
│   ├── services/          # 领域服务
│   └── repositories/      # 仓储接口
├── data/                  # 数据访问层
│   ├── mappers/           # 数据映射器
│   ├── gateways/          # 数据网关
│   └── repositories/      # 仓储实现
├── web/                   # Web表现层
│   ├── controllers/       # 控制器
│   ├── views/            # 视图模板
│   └── middleware/       # 中间件
├── distribution/          # 分布式层
│   ├── facades/          # 远程外观
│   └── dto/              # 数据传输对象
├── infrastructure/        # 基础设施层
│   ├── database/         # 数据库配置
│   ├── cache/           # 缓存配置
│   └── config/          # 系统配置
└── patterns/             # 架构模式实现
    ├── base/            # 基础模式
    ├── concurrency/     # 并发模式
    └── session/         # 会话模式
```

## 快速开始

1. 安装依赖：

```bash
npm install
```

2. 配置数据库：

```bash
npm run db:setup
```

3. 启动应用：

```bash
npm run dev
```

4. 访问应用：

```
http://localhost:3000
```

## 示例场景

本案例通过以下业务场景演示各种架构模式：

1. **用户注册登录** - 演示 Domain Model 和 Identity Map
2. **商品浏览** - 演示 Lazy Load 和 Template View
3. **购物车管理** - 演示 Session State 模式
4. **订单处理** - 演示 Unit of Work 和 Transaction Script
5. **库存管理** - 演示 Optimistic Offline Lock
6. **支付处理** - 演示 Remote Facade 和 Gateway
7. **数据分析** - 演示 Table Module 和 Data Transfer Object

## 学习指南

每个模式都提供了：

- 详细的代码实现
- 使用场景说明
- 优缺点分析
- 替代方案比较
- 最佳实践建议

建议按照以下顺序学习：

1. 先理解领域层模式，建立业务模型概念
2. 学习数据访问模式，理解持久化机制
3. 掌握 Web 表现模式，构建用户界面
4. 了解分布式和并发模式，处理复杂场景

## 贡献指南

欢迎提交 Issue 和 Pull Request 来改进这个案例！
