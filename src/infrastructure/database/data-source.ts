/**
 * 数据库配置
 * 使用 TypeORM 演示 Data Mapper 模式
 */

import { DataSource } from "typeorm";
import { UserEntity } from "./entities/user.entity";
import { ProductEntity } from "./entities/product.entity";
import { OrderEntity } from "./entities/order.entity";
import { OrderItemEntity } from "./entities/order-item.entity";
import { CategoryEntity } from "./entities/category.entity";

/**
 * TypeORM 数据源配置
 * 演示了配置模式和工厂模式
 */
export const AppDataSource = new DataSource({
  type: "postgres",
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "5432", 10),
  username: process.env.DB_USERNAME || "postgres",
  password: process.env.DB_PASSWORD || "password",
  database: process.env.DB_DATABASE || "ecommerce_patterns",
  synchronize: process.env.NODE_ENV === "development",
  logging: process.env.NODE_ENV === "development",
  entities: [
    UserEntity,
    ProductEntity,
    OrderEntity,
    OrderItemEntity,
    CategoryEntity,
  ],
  migrations: ["src/infrastructure/database/migrations/*.ts"],
  subscribers: ["src/infrastructure/database/subscribers/*.ts"],
  ssl:
    process.env.NODE_ENV === "production"
      ? {
          rejectUnauthorized: false,
        }
      : false,
});

/**
 * 初始化数据库连接
 */
export async function initializeDatabase(): Promise<void> {
  try {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
      console.log("✅ 数据库连接已建立");
    }
  } catch (error) {
    console.error("❌ 数据库连接失败:", error);
    throw error;
  }
}

/**
 * 关闭数据库连接
 */
export async function closeDatabase(): Promise<void> {
  try {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
      console.log("✅ 数据库连接已关闭");
    }
  } catch (error) {
    console.error("❌ 关闭数据库连接失败:", error);
    throw error;
  }
}
