/**
 * 路由配置
 * 演示 Front Controller 模式
 *
 * Front Controller 提供集中式的请求处理机制，
 * 将所有请求路由到相应的处理器。
 */

import { Application } from "express";
import userRoutes from "./user.routes";
import productRoutes from "./product.routes";
import orderRoutes from "./order.routes";
import authRoutes from "./auth.routes";

/**
 * 设置应用路由
 * 实现了 Front Controller 模式的路由分发
 */
export function setupRoutes(app: Application): void {
  // 健康检查路由
  app.get("/health", (req, res) => {
    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      patterns: [
        "Domain Model",
        "Data Mapper",
        "Unit of Work",
        "Identity Map",
        "MVC",
        "Front Controller",
        "Page Controller",
        "Template View",
        "Remote Facade",
        "Gateway",
        "Mapper",
        "Layer Supertype",
        "Separated Interface",
      ],
    });
  });

  // API 版本信息
  app.get("/api", (req, res) => {
    res.json({
      name: "企业应用架构模式案例",
      version: "1.0.0",
      description: "演示《企业应用架构模式》一书中的各种架构模式",
      endpoints: {
        auth: "/api/auth",
        users: "/api/users",
        products: "/api/products",
        orders: "/api/orders",
      },
    });
  });

  // 注册各模块路由 - 演示模块化路由管理
  app.use("/api/auth", authRoutes);
  app.use("/api/users", userRoutes);
  app.use("/api/products", productRoutes);
  app.use("/api/orders", orderRoutes);

  // 根路径重定向到首页
  app.get("/", (req, res) => {
    res.redirect("/home");
  });

  // 首页路由 - 演示 Template View 模式
  app.get("/home", (req, res) => {
    res.render("home", {
      title: "企业应用架构模式案例",
      description: "这是一个演示各种企业级架构模式的完整案例",
      patterns: [
        {
          name: "Domain Model",
          description: "将业务逻辑和规则封装在领域对象中",
        },
        {
          name: "Data Mapper",
          description: "在对象和数据库之间移动数据的映射层",
        },
        {
          name: "Unit of Work",
          description: "维护受业务事务影响的对象列表并协调变更",
        },
        {
          name: "Identity Map",
          description: "确保每个对象只加载一次",
        },
        {
          name: "MVC",
          description: "将输入、处理和输出分离",
        },
      ],
    });
  });

  // 404 处理
  app.use("*", (req, res) => {
    res.status(404).json({
      error: "Not Found",
      message: `路径 ${req.originalUrl} 不存在`,
      timestamp: new Date().toISOString(),
    });
  });
}
