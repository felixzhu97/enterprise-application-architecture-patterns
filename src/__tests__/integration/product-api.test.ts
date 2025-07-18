/**
 * 商品API集成测试
 * 
 * 测试商品相关的API端点
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from "supertest";
import { Application } from "express";
import { app } from "../../app";
import { AppDataSource } from "../../infrastructure/database/data-source";

describe("Product API Integration Tests", () => {
  let testApp: Application;
  let authToken: string;

  beforeAll(async () => {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }
    testApp = app;

    // 创建测试用户并获取认证token
    await request(testApp)
      .post("/api/users/register")
      .send({
        email: "producttest@example.com",
        username: "productuser",
        password: "password123",
        firstName: "Product",
        lastName: "Tester",
      });

    const loginResponse = await request(testApp)
      .post("/api/users/login")
      .send({
        email: "producttest@example.com",
        password: "password123",
      });

    authToken = loginResponse.body.data.token;
  });

  afterAll(async () => {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  });

  beforeEach(async () => {
    // 清理测试数据
    await AppDataSource.query("DELETE FROM products WHERE name LIKE '%test%'");
    await AppDataSource.query("DELETE FROM categories WHERE name LIKE '%test%'");
  });

  describe("GET /api/products", () => {
    it("应该返回商品列表", async () => {
      const response = await request(testApp)
        .get("/api/products")
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.products).toBeDefined();
      expect(Array.isArray(response.body.data.products)).toBe(true);
    });

    it("应该支持分页查询", async () => {
      const response = await request(testApp)
        .get("/api/products?page=1&limit=10")
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.pagination).toBeDefined();
      expect(response.body.data.pagination.page).toBe(1);
      expect(response.body.data.pagination.limit).toBe(10);
    });

    it("应该支持按分类筛选", async () => {
      // 先创建一个分类
      const categoryResponse = await request(testApp)
        .post("/api/categories")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          name: "测试分类",
          description: "用于测试的分类",
        });

      const categoryId = categoryResponse.body.data.category.id;

      const response = await request(testApp)
        .get(`/api/products?categoryId=${categoryId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe("GET /api/products/:id", () => {
    let productId: string;

    beforeEach(async () => {
      // 创建测试分类
      const categoryResponse = await request(testApp)
        .post("/api/categories")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          name: "测试分类",
          description: "用于测试的分类",
        });

      const categoryId = categoryResponse.body.data.category.id;

      // 创建测试商品
      const productResponse = await request(testApp)
        .post("/api/products")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          name: "测试商品",
          description: "用于测试的商品",
          price: 99.99,
          stock: 100,
          sku: "TEST001",
          categoryId,
        });

      productId = productResponse.body.data.product.id;
    });

    it("应该返回指定商品的详细信息", async () => {
      const response = await request(testApp)
        .get(`/api/products/${productId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.product.id).toBe(productId);
      expect(response.body.data.product.name).toBe("测试商品");
    });

    it("应该处理不存在的商品", async () => {
      const response = await request(testApp)
        .get("/api/products/non-existent-id")
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain("商品不存在");
    });
  });

  describe("POST /api/products", () => {
    let categoryId: string;

    beforeEach(async () => {
      // 创建测试分类
      const categoryResponse = await request(testApp)
        .post("/api/categories")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          name: "测试分类",
          description: "用于测试的分类",
        });

      categoryId = categoryResponse.body.data.category.id;
    });

    const validProductData = {
      name: "新测试商品",
      description: "这是一个测试商品",
      price: 199.99,
      stock: 50,
      sku: "NEWTEST001",
    };

    it("应该成功创建商品", async () => {
      const response = await request(testApp)
        .post("/api/products")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          ...validProductData,
          categoryId,
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.product.name).toBe(validProductData.name);
      expect(response.body.data.product.price).toBe(validProductData.price);
    });

    it("应该拒绝未认证的请求", async () => {
      const response = await request(testApp)
        .post("/api/products")
        .send({
          ...validProductData,
          categoryId,
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it("应该验证必填字段", async () => {
      const response = await request(testApp)
        .post("/api/products")
        .set("Authorization", `Bearer ${authToken}`)
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });

    it("应该验证价格格式", async () => {
      const response = await request(testApp)
        .post("/api/products")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          ...validProductData,
          categoryId,
          price: -100,
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors.some((error: any) => error.field === "price")).toBe(true);
    });

    it("应该拒绝重复的SKU", async () => {
      // 先创建一个商品
      await request(testApp)
        .post("/api/products")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          ...validProductData,
          categoryId,
        });

      // 尝试创建相同SKU的商品
      const response = await request(testApp)
        .post("/api/products")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          ...validProductData,
          name: "另一个商品",
          categoryId,
        })
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain("SKU");
    });
  });

  describe("PUT /api/products/:id", () => {
    let productId: string;
    let categoryId: string;

    beforeEach(async () => {
      // 创建测试分类
      const categoryResponse = await request(testApp)
        .post("/api/categories")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          name: "测试分类",
          description: "用于测试的分类",
        });

      categoryId = categoryResponse.body.data.category.id;

      // 创建测试商品
      const productResponse = await request(testApp)
        .post("/api/products")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          name: "原始商品",
          description: "原始描述",
          price: 100.00,
          stock: 50,
          sku: "ORIGINAL001",
          categoryId,
        });

      productId = productResponse.body.data.product.id;
    });

    it("应该成功更新商品", async () => {
      const updateData = {
        name: "更新后的商品",
        price: 150.00,
        stock: 75,
      };

      const response = await request(testApp)
        .put(`/api/products/${productId}`)
        .set("Authorization", `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.product.name).toBe(updateData.name);
      expect(response.body.data.product.price).toBe(updateData.price);
      expect(response.body.data.product.stock).toBe(updateData.stock);
    });

    it("应该拒绝更新不存在的商品", async () => {
      const response = await request(testApp)
        .put("/api/products/non-existent-id")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ name: "更新" })
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it("应该验证更新数据", async () => {
      const response = await request(testApp)
        .put(`/api/products/${productId}`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({ price: -50 })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });
  });

  describe("DELETE /api/products/:id", () => {
    let productId: string;

    beforeEach(async () => {
      // 创建测试分类
      const categoryResponse = await request(testApp)
        .post("/api/categories")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          name: "测试分类",
          description: "用于测试的分类",
        });

      const categoryId = categoryResponse.body.data.category.id;

      // 创建测试商品
      const productResponse = await request(testApp)
        .post("/api/products")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          name: "待删除商品",
          description: "这个商品将被删除",
          price: 100.00,
          stock: 10,
          sku: "DELETE001",
          categoryId,
        });

      productId = productResponse.body.data.product.id;
    });

    it("应该成功删除商品", async () => {
      const response = await request(testApp)
        .delete(`/api/products/${productId}`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);

      // 验证商品已被删除
      await request(testApp)
        .get(`/api/products/${productId}`)
        .expect(404);
    });

    it("应该拒绝删除不存在的商品", async () => {
      const response = await request(testApp)
        .delete("/api/products/non-existent-id")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it("应该拒绝未认证的删除请求", async () => {
      const response = await request(testApp)
        .delete(`/api/products/${productId}`)
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe("GET /api/products/search", () => {
    beforeEach(async () => {
      // 创建测试分类
      const categoryResponse = await request(testApp)
        .post("/api/categories")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          name: "搜索测试分类",
          description: "用于搜索测试的分类",
        });

      const categoryId = categoryResponse.body.data.category.id;

      // 创建多个测试商品
      const products = [
        { name: "iPhone 15", sku: "IPHONE15001" },
        { name: "iPhone 15 Pro", sku: "IPHONE15PRO001" },
        { name: "MacBook Pro", sku: "MACBOOK001" },
        { name: "iPad Air", sku: "IPAD001" },
      ];

      for (const product of products) {
        await request(testApp)
          .post("/api/products")
          .set("Authorization", `Bearer ${authToken}`)
          .send({
            ...product,
            description: `${product.name}的描述`,
            price: 1000,
            stock: 10,
            categoryId,
          });
      }
    });

    it("应该根据关键词搜索商品", async () => {
      const response = await request(testApp)
        .get("/api/products/search?q=iPhone")
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.products.length).toBeGreaterThan(0);
      expect(response.body.data.products.every((p: any) => 
        p.name.includes("iPhone")
      )).toBe(true);
    });

    it("应该支持空搜索结果", async () => {
      const response = await request(testApp)
        .get("/api/products/search?q=不存在的商品")
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.products).toHaveLength(0);
    });

    it("应该支持搜索分页", async () => {
      const response = await request(testApp)
        .get("/api/products/search?q=iPhone&page=1&limit=1")
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.pagination.page).toBe(1);
      expect(response.body.data.pagination.limit).toBe(1);
    });
  });

  describe("PATCH /api/products/:id/stock", () => {
    let productId: string;

    beforeEach(async () => {
      // 创建测试分类
      const categoryResponse = await request(testApp)
        .post("/api/categories")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          name: "库存测试分类",
          description: "用于库存测试的分类",
        });

      const categoryId = categoryResponse.body.data.category.id;

      // 创建测试商品
      const productResponse = await request(testApp)
        .post("/api/products")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          name: "库存测试商品",
          description: "用于测试库存更新",
          price: 100.00,
          stock: 50,
          sku: "STOCK001",
          categoryId,
        });

      productId = productResponse.body.data.product.id;
    });

    it("应该成功更新商品库存", async () => {
      const newStock = 100;
      const response = await request(testApp)
        .patch(`/api/products/${productId}/stock`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({ stock: newStock })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.product.stock).toBe(newStock);
    });

    it("应该拒绝负数库存", async () => {
      const response = await request(testApp)
        .patch(`/api/products/${productId}/stock`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({ stock: -10 })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });
  });
});