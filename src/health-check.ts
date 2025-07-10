/**
 * 应用健康检查
 *
 * 这个文件用于Docker健康检查和系统监控
 * 检查应用的各个组件是否正常运行
 */

import { createConnection } from "typeorm";
import { createClient } from "redis";
import http from "http";

interface HealthCheckResult {
  status: "healthy" | "unhealthy";
  timestamp: string;
  checks: {
    database: {
      status: "pass" | "fail";
      responseTime?: number;
      error?: string;
    };
    redis: {
      status: "pass" | "fail";
      responseTime?: number;
      error?: string;
    };
    application: {
      status: "pass" | "fail";
      responseTime?: number;
      error?: string;
    };
  };
  uptime: number;
  version: string;
}

/**
 * 检查数据库连接
 */
async function checkDatabase(): Promise<{
  status: "pass" | "fail";
  responseTime?: number;
  error?: string;
}> {
  const startTime = Date.now();

  try {
    const connection = await createConnection({
      type: "postgres",
      host: process.env.DB_HOST || "localhost",
      port: parseInt(process.env.DB_PORT || "5432"),
      username: process.env.DB_USERNAME || "eaap_user",
      password: process.env.DB_PASSWORD || "eaap_password",
      database: process.env.DB_NAME || "enterprise_architecture_patterns",
      connectTimeoutMS: 5000,
    });

    // 执行简单查询测试连接
    await connection.query("SELECT 1");
    await connection.close();

    const responseTime = Date.now() - startTime;
    return {
      status: "pass",
      responseTime,
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    return {
      status: "fail",
      responseTime,
      error: error instanceof Error ? error.message : "Unknown database error",
    };
  }
}

/**
 * 检查Redis连接
 */
async function checkRedis(): Promise<{
  status: "pass" | "fail";
  responseTime?: number;
  error?: string;
}> {
  const startTime = Date.now();

  try {
    const client = createClient({
      url: process.env.REDIS_URL || "redis://localhost:6379",
      socket: {
        connectTimeout: 5000,
      },
    });

    await client.connect();
    await client.ping();
    await client.disconnect();

    const responseTime = Date.now() - startTime;
    return {
      status: "pass",
      responseTime,
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    return {
      status: "fail",
      responseTime,
      error: error instanceof Error ? error.message : "Unknown Redis error",
    };
  }
}

/**
 * 检查应用程序本身
 */
async function checkApplication(): Promise<{
  status: "pass" | "fail";
  responseTime?: number;
  error?: string;
}> {
  const startTime = Date.now();

  return new Promise((resolve) => {
    const port = process.env.PORT || 3000;
    const options = {
      hostname: "localhost",
      port: port,
      path: "/api/health",
      method: "GET",
      timeout: 5000,
    };

    const req = http.request(options, (res) => {
      const responseTime = Date.now() - startTime;

      if (res.statusCode === 200) {
        resolve({
          status: "pass",
          responseTime,
        });
      } else {
        resolve({
          status: "fail",
          responseTime,
          error: `HTTP ${res.statusCode}`,
        });
      }
    });

    req.on("error", (error) => {
      const responseTime = Date.now() - startTime;
      resolve({
        status: "fail",
        responseTime,
        error: error.message,
      });
    });

    req.on("timeout", () => {
      const responseTime = Date.now() - startTime;
      req.destroy();
      resolve({
        status: "fail",
        responseTime,
        error: "Request timeout",
      });
    });

    req.end();
  });
}

/**
 * 执行完整的健康检查
 */
async function performHealthCheck(): Promise<HealthCheckResult> {
  const startTime = Date.now();

  console.log("开始健康检查...");

  // 并行执行所有检查
  const [databaseCheck, redisCheck, applicationCheck] = await Promise.all([
    checkDatabase(),
    checkRedis(),
    checkApplication(),
  ]);

  const allChecksPass =
    databaseCheck.status === "pass" &&
    redisCheck.status === "pass" &&
    applicationCheck.status === "pass";

  const result: HealthCheckResult = {
    status: allChecksPass ? "healthy" : "unhealthy",
    timestamp: new Date().toISOString(),
    checks: {
      database: databaseCheck,
      redis: redisCheck,
      application: applicationCheck,
    },
    uptime: process.uptime(),
    version: process.env.npm_package_version || "1.0.0",
  };

  const totalTime = Date.now() - startTime;
  console.log(`健康检查完成，耗时: ${totalTime}ms, 状态: ${result.status}`);

  return result;
}

/**
 * 主函数 - 当作为独立脚本运行时
 */
async function main() {
  try {
    const result = await performHealthCheck();

    // 输出结果到控制台
    console.log(JSON.stringify(result, null, 2));

    // 根据健康状态设置退出码
    const exitCode = result.status === "healthy" ? 0 : 1;
    process.exit(exitCode);
  } catch (error) {
    console.error("健康检查失败:", error);

    const errorResult: HealthCheckResult = {
      status: "unhealthy",
      timestamp: new Date().toISOString(),
      checks: {
        database: { status: "fail", error: "Health check failed" },
        redis: { status: "fail", error: "Health check failed" },
        application: { status: "fail", error: "Health check failed" },
      },
      uptime: process.uptime(),
      version: process.env.npm_package_version || "1.0.0",
    };

    console.log(JSON.stringify(errorResult, null, 2));
    process.exit(1);
  }
}

// 如果直接运行此文件，执行健康检查
if (require.main === module) {
  main();
}

// 导出函数供其他模块使用
export {
  performHealthCheck,
  checkDatabase,
  checkRedis,
  checkApplication,
  HealthCheckResult,
};
