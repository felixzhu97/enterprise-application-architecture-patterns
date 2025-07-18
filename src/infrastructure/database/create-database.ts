/**
 * Database Creation Script
 * 
 * Creates the application database if it doesn't exist.
 * Follows enterprise patterns with proper error handling and logging.
 */

import { Client, ClientConfig } from "pg";
import * as dotenv from "dotenv";
import { logger } from "../config/logger";

dotenv.config();

/**
 * Database configuration interface
 */
interface DatabaseConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  name: string;
}

/**
 * Database creation result
 */
interface DatabaseCreationResult {
  success: boolean;
  message: string;
  error?: Error;
}

/**
 * Configuration factory for database connection
 */
class DatabaseConfigFactory {
  static createConfig(): DatabaseConfig {
    return {
      host: process.env.DB_HOST || "localhost",
      port: parseInt(process.env.DB_PORT || "5432", 10),
      username: process.env.DB_USERNAME || "postgres",
      password: process.env.DB_PASSWORD || "password",
      name: process.env.DB_NAME || "enterprise_app",
    };
  }

  static createClientConfig(config: DatabaseConfig, targetDatabase = "postgres"): ClientConfig {
    return {
      host: config.host,
      port: config.port,
      user: config.username,
      password: config.password,
      database: targetDatabase,
      connectionTimeoutMillis: 5000,
      query_timeout: 10000,
    };
  }
}

/**
 * Database creation service following enterprise patterns
 */
class DatabaseCreationService {
  private config: DatabaseConfig;

  constructor(config: DatabaseConfig) {
    this.config = config;
  }

  /**
   * Creates database if it doesn't exist
   */
  async createDatabase(): Promise<DatabaseCreationResult> {
    const client = new Client(
      DatabaseConfigFactory.createClientConfig(this.config)
    );

    try {
      logger.info("Attempting to connect to PostgreSQL server", {
        host: this.config.host,
        port: this.config.port,
        database: this.config.name,
      });

      await client.connect();
      logger.info("Successfully connected to PostgreSQL server");

      const exists = await this.checkDatabaseExists(client, this.config.name);
      
      if (exists) {
        const message = `Database "${this.config.name}" already exists`;
        logger.info(message);
        return { success: true, message };
      }

      await this.createDatabaseIfNotExists(client, this.config.name);
      const message = `Database "${this.config.name}" created successfully`;
      logger.info(message);
      
      return { success: true, message };

    } catch (error) {
      const errorMessage = `Failed to create database "${this.config.name}"`;
      logger.error(errorMessage, error as Error, {
        host: this.config.host,
        port: this.config.port,
        database: this.config.name,
      });
      
      return {
        success: false,
        message: errorMessage,
        error: error as Error,
      };
    } finally {
      try {
        await client.end();
        logger.debug("Database connection closed");
      } catch (closeError) {
        logger.warn("Error closing database connection", { error: closeError });
      }
    }
  }

  /**
   * Checks if database exists
   */
  private async checkDatabaseExists(client: Client, dbName: string): Promise<boolean> {
    const result = await client.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      [dbName]
    );
    return result.rows.length > 0;
  }

  /**
   * Creates the database
   */
  private async createDatabaseIfNotExists(client: Client, dbName: string): Promise<void> {
    // Use identifier quoting to handle special characters in database names
    await client.query(`CREATE DATABASE "${dbName}"`);
  }
}

/**
 * Main function to create database
 */
async function createDatabase(): Promise<DatabaseCreationResult> {
  try {
    const config = DatabaseConfigFactory.createConfig();
    const service = new DatabaseCreationService(config);
    return await service.createDatabase();
  } catch (error) {
    logger.error("Unexpected error in database creation process", error as Error);
    return {
      success: false,
      message: "Unexpected error occurred",
      error: error as Error,
    };
  }
}

// CLI execution
if (require.main === module) {
  createDatabase()
    .then((result) => {
      if (result.success) {
        logger.info("Database creation process completed successfully");
        process.exit(0);
      } else {
        logger.error("Database creation process failed", result.error);
        process.exit(1);
      }
    })
    .catch((error) => {
      logger.error("Fatal error in database creation", error);
      process.exit(1);
    });
}

export { createDatabase, DatabaseCreationService, DatabaseConfigFactory };