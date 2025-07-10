import "reflect-metadata";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import dotenv from "dotenv";
import { engine } from "express-handlebars";
import path from "path";

import { AppDataSource } from "./infrastructure/database/data-source";
import { setupRoutes } from "./web/routes";
import { errorHandler } from "./web/middleware/error-handler";
import { setupSession } from "./web/middleware/session";
import { logger } from "./infrastructure/config/logger";

// 加载环境变量
dotenv.config();

/**
 * 企业应用架构模式演示应用
 *
 * 这个应用演示了《企业应用架构模式》一书中的各种架构模式：
 * - Domain Model（领域模型）
 * - Data Mapper（数据映射器）
 * - Unit of Work（工作单元）
 * - Identity Map（身份映射）
 * - MVC（模型-视图-控制器）
 * - Remote Facade（远程外观）
 * - 以及更多模式...
 */
class Application {
  private app: express.Application;
  private port: number;

  constructor() {
    this.app = express();
    this.port = parseInt(process.env.PORT || "3000", 10);
    this.setupMiddleware();
    this.setupTemplateEngine();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  /**
   * 配置中间件
   * 演示了 Layer Supertype 模式 - 为所有请求提供通用功能
   */
  private setupMiddleware(): void {
    // 安全中间件
    this.app.use(helmet());

    // CORS支持
    this.app.use(
      cors({
        origin:
          process.env.NODE_ENV === "production"
            ? false
            : ["http://localhost:3000", "http://localhost:3001"],
        credentials: true,
      })
    );

    // 日志中间件
    this.app.use(
      morgan("combined", {
        stream: { write: (message) => logger.info(message.trim()) },
      })
    );

    // 请求解析中间件
    this.app.use(express.json({ limit: "10mb" }));
    this.app.use(express.urlencoded({ extended: true, limit: "10mb" }));

    // 静态文件服务
    this.app.use("/static", express.static(path.join(__dirname, "../public")));

    // 会话中间件 - 演示 Session State 模式
    setupSession(this.app);
  }

  /**
   * 配置模板引擎
   * 演示了 Template View 模式
   */
  private setupTemplateEngine(): void {
    this.app.engine(
      "handlebars",
      engine({
        defaultLayout: "main",
        layoutsDir: path.join(__dirname, "../views/layouts"),
        partialsDir: path.join(__dirname, "../views/partials"),
        helpers: {
          json: (context: any) => JSON.stringify(context),
          eq: (a: any, b: any) => a === b,
          formatCurrency: (amount: number) => `¥${amount.toFixed(2)}`,
          formatDate: (date: Date) => date.toLocaleDateString("zh-CN"),
        },
      })
    );

    this.app.set("view engine", "handlebars");
    this.app.set("views", path.join(__dirname, "../views"));
  }

  /**
   * 配置路由
   * 演示了 Front Controller 模式
   */
  private setupRoutes(): void {
    setupRoutes(this.app);
  }

  /**
   * 配置错误处理
   * 演示了统一错误处理策略
   */
  private setupErrorHandling(): void {
    this.app.use(errorHandler);
  }

  /**
   * 启动应用程序
   */
  public async start(): Promise<void> {
    try {
      // 初始化数据库连接
      await AppDataSource.initialize();
      logger.info("数据库连接已建立");

      // 启动HTTP服务器
      this.app.listen(this.port, () => {
        logger.info(`服务器运行在端口 ${this.port}`);
        logger.info(`环境: ${process.env.NODE_ENV || "development"}`);
        logger.info(`访问地址: http://localhost:${this.port}`);

        // 打印架构模式信息
        this.printArchitectureInfo();
      });
    } catch (error) {
      logger.error("应用启动失败:", error);
      process.exit(1);
    }
  }

  /**
   * 打印架构模式信息
   */
  private printArchitectureInfo(): void {
    console.log("\n🏗️  企业应用架构模式演示");
    console.log("=====================================");
    console.log("📚 实现的架构模式:");
    console.log("   • Domain Model (领域模型)");
    console.log("   • Data Mapper (数据映射器)");
    console.log("   • Unit of Work (工作单元)");
    console.log("   • Identity Map (身份映射)");
    console.log("   • MVC (模型-视图-控制器)");
    console.log("   • Remote Facade (远程外观)");
    console.log("   • Template View (模板视图)");
    console.log("   • Front Controller (前端控制器)");
    console.log("   • Gateway (网关)");
    console.log("   • DTO (数据传输对象)");
    console.log("   • 以及更多...");
    console.log("=====================================\n");
  }

  /**
   * 优雅关闭应用程序
   */
  public async shutdown(): Promise<void> {
    logger.info("正在关闭应用程序...");

    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
      logger.info("数据库连接已关闭");
    }

    logger.info("应用程序已关闭");
    process.exit(0);
  }
}

// 创建并启动应用程序
const app = new Application();

// 处理优雅关闭
process.on("SIGTERM", () => app.shutdown());
process.on("SIGINT", () => app.shutdown());

// 处理未捕获的异常
process.on("unhandledRejection", (reason, promise) => {
  logger.error("未处理的Promise拒绝:", reason);
  process.exit(1);
});

process.on("uncaughtException", (error) => {
  logger.error("未捕获的异常:", error);
  process.exit(1);
});

// 启动应用
if (require.main === module) {
  app.start();
}

export default app;
