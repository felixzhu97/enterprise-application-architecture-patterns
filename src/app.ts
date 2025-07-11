import express from "express";
import { engine } from "express-handlebars";
import path from "path";
import session from "express-session";
import cookieParser from "cookie-parser";
import { rateLimit } from "express-rate-limit";
import helmet from "helmet";
import cors from "cors";

// 路由导入
import userRoutes from "./web/routes/user.routes";
import productRoutes from "./web/routes/product.routes";
import { setupRoutes } from "./web/routes/index";

// 中间件导入
import { errorHandler } from "./web/middleware/error-handler";
import { csrfProtection } from "./web/middleware/csrf";
import { setupSession } from "./web/middleware/session";
import { rateLimiter } from "./web/middleware/rate-limiter";
import { optionalAuth } from "./web/middleware/auth";

// 模式演示导入
import { PatternsShowcase } from "./patterns/demo/patterns-showcase";

// 配置和实用程序
import { logger } from "./infrastructure/config/logger";
import { initializeDatabase } from "./infrastructure/database/data-source";

const app: express.Application = express();
const PORT = process.env.PORT || 3000;

// 视图引擎设置
app.engine(
  "hbs",
  engine({
    extname: ".hbs",
    defaultLayout: "main",
    layoutsDir: path.join(__dirname, "../views/layouts"),
    partialsDir: path.join(__dirname, "../views/partials"),
    helpers: {
      // 自定义Handlebars helpers
      formatDate: (date: Date) => {
        return date.toLocaleDateString("zh-CN");
      },
      formatCurrency: (amount: number) => {
        return `¥${amount.toFixed(2)}`;
      },
      eq: (a: any, b: any) => a === b,
      ne: (a: any, b: any) => a !== b,
      gt: (a: number, b: number) => a > b,
      lt: (a: number, b: number) => a < b,
      and: (a: any, b: any) => a && b,
      or: (a: any, b: any) => a || b,
      not: (a: any) => !a,
      json: (obj: any) => JSON.stringify(obj),
      times: (n: number, options: any) => {
        let result = "";
        for (let i = 0; i < n; i++) {
          result += options.fn(i);
        }
        return result;
      },
    },
  })
);

app.set("view engine", "hbs");
app.set("views", path.join(__dirname, "../views"));

// 基础中间件
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'",
          "https://cdnjs.cloudflare.com",
        ],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'"],
        fontSrc: ["'self'", "https://cdnjs.cloudflare.com"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: false,
  })
);

app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:3000",
    credentials: true,
  })
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());

// 静态文件服务
app.use(express.static(path.join(__dirname, "../public")));

// 速率限制
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 100, // 每个IP最多100个请求
  message: "请求过于频繁，请稍后再试",
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// 会话管理
setupSession(app);

// 应用级中间件
app.use(optionalAuth);

// 路由
setupRoutes(app);
app.use("/users", userRoutes);
app.use("/products", productRoutes);

// 企业应用架构模式演示路由
app.get("/patterns", async (req, res) => {
  try {
    logger.info("开始企业应用架构模式演示");

    // 创建模式演示实例
    const showcase = new PatternsShowcase();

    // 运行所有模式的演示
    await showcase.demonstrateAllPatterns();

    // 获取实现统计
    const stats = showcase.getImplementedPatternsStats();

    res.render("patterns/showcase", {
      title: "企业应用架构模式演示",
      stats: stats,
      categories: stats.categories,
      implementedPatterns: [
        {
          name: "Unit of Work",
          category: "数据源架构模式",
          description: "维护受业务事务影响的对象列表并协调变更的写入",
          implemented: true,
        },
        {
          name: "Identity Map",
          category: "数据源架构模式",
          description: "确保每个对象只被加载一次，维护对象身份一致性",
          implemented: true,
        },
        {
          name: "Lazy Load",
          category: "数据源架构模式",
          description: "按需加载关联对象，提高性能",
          implemented: true,
        },
        {
          name: "Active Record",
          category: "领域逻辑模式",
          description: "对象既包含数据又包含数据库访问逻辑",
          implemented: true,
        },
        {
          name: "Value Object",
          category: "对象关系行为模式",
          description: "如Money、Email等不可变值对象",
          implemented: true,
        },
        {
          name: "Registry",
          category: "基础模式",
          description: "全局对象查找机制",
          implemented: true,
        },
        {
          name: "Table Module",
          category: "领域逻辑模式",
          description: "为单个数据库表提供业务逻辑",
          implemented: true,
        },
        {
          name: "Table Data Gateway",
          category: "数据源架构模式",
          description: "为数据库表提供简单的访问接口",
          implemented: true,
        },
        {
          name: "Transaction Script",
          category: "领域逻辑模式",
          description: "将业务逻辑组织为单个过程",
          implemented: true,
        },
        {
          name: "Special Case",
          category: "对象关系行为模式",
          description: "处理特殊情况的对象",
          implemented: true,
        },
        {
          name: "Plugin",
          category: "行为模式",
          description: "支持可插拔的组件架构",
          implemented: true,
        },
        {
          name: "Service Stub",
          category: "测试模式",
          description: "用于测试的服务替身",
          implemented: true,
        },
        {
          name: "Optimistic Lock",
          category: "并发模式",
          description: "乐观并发控制",
          implemented: true,
        },
        {
          name: "Pessimistic Lock",
          category: "并发模式",
          description: "悲观并发控制",
          implemented: true,
        },
        {
          name: "Session State",
          category: "会话状态模式",
          description: "管理会话状态",
          implemented: true,
        },
      ],
    });

    logger.info("企业应用架构模式演示完成");
  } catch (error) {
    logger.error("模式演示失败:", error as Error);
    res.status(500).render("error", {
      title: "错误",
      message: "模式演示失败",
      error: error,
    });
  }
});

// API 路由 - 获取模式统计
app.get("/api/patterns/stats", async (req, res) => {
  try {
    const showcase = new PatternsShowcase();
    const stats = showcase.getImplementedPatternsStats();

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    logger.error("获取模式统计失败:", error as Error);
    res.status(500).json({
      success: false,
      error: "获取模式统计失败",
    });
  }
});

// 健康检查路由
app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || "development",
    version: process.env.npm_package_version || "1.0.0",
  });
});

// 错误处理中间件
app.use(errorHandler);

// 404 处理
app.use((req, res) => {
  res.status(404).render("error", {
    title: "页面未找到",
    message: `页面 ${req.originalUrl} 未找到`,
    error: null,
  });
});

// 应用启动
async function startServer() {
  try {
    // 初始化数据库
    logger.info("正在初始化数据库...");
    const dbConnected = await initializeDatabase();

    if (dbConnected) {
      logger.info("✅ 数据库模式已启用");
    } else {
      logger.info("🔄 演示模式已启用（无数据库）");
    }

    // 启动模式演示
    logger.info("正在启动企业应用架构模式演示...");
    const showcase = new PatternsShowcase();

    // 在后台运行演示（不阻塞服务器启动）
    setTimeout(async () => {
      try {
        await showcase.demonstrateAllPatterns();
        logger.info("✅ 企业应用架构模式演示完成");
      } catch (error) {
        logger.error("❌ 模式演示失败:", error as Error);
      }
    }, 1000);

    // 启动服务器
    const server = app.listen(PORT, () => {
      logger.info(`🚀 服务器已启动: http://localhost:${PORT}`);
      logger.info(`📋 模式演示: http://localhost:${PORT}/patterns`);
      logger.info(`🏥 健康检查: http://localhost:${PORT}/health`);
      logger.info(`📊 模式统计: http://localhost:${PORT}/api/patterns/stats`);

      // 打印实现的模式
      const patterns = [
        "Unit of Work",
        "Identity Map",
        "Lazy Load",
        "Active Record",
        "Value Object",
        "Registry",
        "Table Module",
        "Table Data Gateway",
        "Transaction Script",
        "Special Case",
        "Plugin",
        "Service Stub",
        "Optimistic Lock",
        "Pessimistic Lock",
        "Session State",
      ];

      logger.info("🎯 已实现的企业应用架构模式:");
      patterns.forEach((pattern, index) => {
        logger.info(`   ${index + 1}. ${pattern}`);
      });

      logger.info("📖 基于 Martin Fowler 的《企业应用架构模式》");
    });

    // 优雅关闭
    process.on("SIGTERM", () => {
      logger.info("收到 SIGTERM 信号，正在优雅关闭...");
      server.close(() => {
        logger.info("服务器已关闭");
        process.exit(0);
      });
    });

    process.on("SIGINT", () => {
      logger.info("收到 SIGINT 信号，正在优雅关闭...");
      server.close(() => {
        logger.info("服务器已关闭");
        process.exit(0);
      });
    });
  } catch (error) {
    logger.error("启动服务器失败:", error as Error);
    process.exit(1);
  }
}

// 启动应用
startServer();

export { app };
