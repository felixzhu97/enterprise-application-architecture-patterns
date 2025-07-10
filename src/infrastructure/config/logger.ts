/**
 * 日志配置
 * 演示 Gateway 模式 - 为日志记录提供统一接口
 */

import winston from "winston";
import { Logger } from "../../patterns/base/separated-interface";

/**
 * Winston日志器实现
 * 实现了分离的日志接口
 */
class WinstonLogger implements Logger {
  private winstonLogger: winston.Logger;

  constructor() {
    this.winstonLogger = winston.createLogger({
      level: process.env.LOG_LEVEL || "info",
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json(),
        winston.format.colorize({ all: true })
      ),
      defaultMeta: { service: "企业架构模式案例" },
      transports: [
        // 控制台输出
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          ),
        }),

        // 错误日志文件
        new winston.transports.File({
          filename: "logs/error.log",
          level: "error",
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json()
          ),
        }),

        // 所有日志文件
        new winston.transports.File({
          filename: "logs/combined.log",
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json()
          ),
        }),
      ],
    });

    // 在生产环境中不输出到控制台
    if (process.env.NODE_ENV === "production") {
      this.winstonLogger.remove(this.winstonLogger.transports[0]);
    }
  }

  info(message: string, meta?: any): void {
    this.winstonLogger.info(message, meta);
  }

  warn(message: string, meta?: any): void {
    this.winstonLogger.warn(message, meta);
  }

  error(message: string, error?: Error, meta?: any): void {
    if (error) {
      this.winstonLogger.error(message, {
        error: error.message,
        stack: error.stack,
        ...meta,
      });
    } else {
      this.winstonLogger.error(message, meta);
    }
  }

  debug(message: string, meta?: any): void {
    this.winstonLogger.debug(message, meta);
  }
}

// 创建全局日志器实例
export const logger = new WinstonLogger();

/**
 * 创建命名日志器
 */
export function createLogger(name: string): Logger {
  return new WinstonLogger();
}
