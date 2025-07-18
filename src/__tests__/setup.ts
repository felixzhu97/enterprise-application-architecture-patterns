/**
 * Jest Test Environment Setup
 * 
 * This file executes before all tests to configure the test environment
 */

import { AppDataSource } from "../infrastructure/database/data-source";

// Test configuration constants
const TEST_CONFIG = {
    TIMEOUT: 30000,
    DB: {
        HOST: process.env.TEST_DB_HOST || "localhost",
        PORT: process.env.TEST_DB_PORT || "5432",
        NAME: process.env.TEST_DB_NAME || "enterprise_test",
        USERNAME: process.env.TEST_DB_USERNAME || "test_user",
        PASSWORD: process.env.TEST_DB_PASSWORD || "test_password",
    },
    REDIS_URL: process.env.TEST_REDIS_URL || "redis://localhost:6379/1",
    JWT_SECRET: process.env.TEST_JWT_SECRET || "test-jwt-secret-key",
    SESSION_SECRET: process.env.TEST_SESSION_SECRET || "test-session-secret",
} as const;

// Set test timeout
jest.setTimeout(TEST_CONFIG.TIMEOUT);

// Global test setup
beforeAll(async () => {
    // Configure test environment variables
    process.env.NODE_ENV = "test";
    process.env.DB_HOST = TEST_CONFIG.DB.HOST;
    process.env.DB_PORT = TEST_CONFIG.DB.PORT;
    process.env.DB_NAME = TEST_CONFIG.DB.NAME;
    process.env.DB_USERNAME = TEST_CONFIG.DB.USERNAME;
    process.env.DB_PASSWORD = TEST_CONFIG.DB.PASSWORD;
    process.env.REDIS_URL = TEST_CONFIG.REDIS_URL;
    process.env.JWT_SECRET = TEST_CONFIG.JWT_SECRET;
    process.env.SESSION_SECRET = TEST_CONFIG.SESSION_SECRET;

    // Initialize test database connection
    try {
        if (!AppDataSource.isInitialized) {
            await AppDataSource.initialize();
            console.log("Test database connection established");
        }
    } catch (error) {
        console.error("Failed to initialize test database:", error);
        throw new Error("Test database setup failed. Tests cannot proceed.");
    }
});

// Global test cleanup
afterAll(async () => {
    try {
        if (AppDataSource.isInitialized) {
            await AppDataSource.destroy();
            console.log("Test database connection closed");
        }
    } catch (error) {
        console.error("Failed to cleanup test database:", error);
    }
});

// Mock console methods to reduce test noise
const originalConsole = { ...console };

beforeEach(() => {
    // Silence console output during tests, except for errors
    console.log = jest.fn();
    console.info = jest.fn();
    console.warn = jest.fn();
    console.error = originalConsole.error;
});

afterEach(() => {
    // Restore console methods
    Object.assign(console, originalConsole);
});

// Global error handling
process.on("unhandledRejection", (reason, promise) => {
    console.error("Unhandled Rejection at:", promise, "reason:", reason);
});

process.on("uncaughtException", (error) => {
    console.error("Uncaught Exception:", error);
});