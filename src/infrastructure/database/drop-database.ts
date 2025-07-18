/**
 * 数据库删除脚本
 * 
 * 用于删除应用程序数据库（谨慎使用）
 */

import { Client } from "pg";
import * as dotenv from "dotenv";

dotenv.config();

async function dropDatabase() {
  const dbName = process.env.DB_NAME || "enterprise_app";
  const client = new Client({
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT || "5432"),
    user: process.env.DB_USERNAME || "postgres",
    password: process.env.DB_PASSWORD || "password",
    database: "postgres", // 连接到默认数据库
  });

  try {
    await client.connect();
    
    // 终止所有连接到目标数据库的会话
    await client.query(`
      SELECT pg_terminate_backend(pid)
      FROM pg_stat_activity
      WHERE datname = $1 AND pid <> pg_backend_pid()
    `, [dbName]);

    // 删除数据库
    await client.query(`DROP DATABASE IF EXISTS "${dbName}"`);
    console.log(`✅ 数据库 "${dbName}" 删除成功`);
  } catch (error) {
    console.error("❌ 删除数据库失败:", error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

if (require.main === module) {
  dropDatabase();
}

export { dropDatabase };