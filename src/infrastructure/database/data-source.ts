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
export async function initializeDatabase(): Promise<boolean> {
  try {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
      console.log("✅ 数据库连接已建立");
      return true;
    }
    return true;
  } catch (error) {
    console.warn(
      "⚠️  数据库连接失败，将在无数据库模式下运行:",
      (error as Error).message
    );
    console.log("💡 提示：您可以配置以下环境变量来连接数据库：");
    console.log("   DB_HOST=localhost");
    console.log("   DB_PORT=5432");
    console.log("   DB_USERNAME=postgres");
    console.log("   DB_PASSWORD=your_password");
    console.log("   DB_DATABASE=your_database");
    console.log(
      "   或者启动Docker容器：docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=password postgres"
    );
    return false;
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
