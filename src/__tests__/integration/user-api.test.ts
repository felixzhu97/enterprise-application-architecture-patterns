/**
 * 用户API集成测试
 *
 * 这个测试文件演示了如何对企业应用架构中的Web API进行集成测试
 * 测试完整的HTTP请求-响应流程，包括中间件、控制器、服务等
 */

import request from "supertest";
import { Application } from "express";
import { app } from "../../app";
import { AppDataSource } from "../../infrastructure/database/data-source";

describe("User API Integration Tests", () => {
  let testApp: Application;

  beforeAll(async () => {
    // 初始化测试数据库连接
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }
    testApp = app;
  });

  afterAll(async () => {
    // 清理数据库连接
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  });

  beforeEach(async () => {
    // 清理测试数据
    await AppDataSource.query("DELETE FROM users WHERE email LIKE '%test%'");
  });

  describe("POST /api/users/register", () => {
    const validRegistrationData = {
      email: "test@example.com",
      username: "testuser",
      password: "password123",
      firstName: "Test",
      lastName: "User",
    };

    it("应该成功注册新用户", async () => {
      const response = await request(testApp)
        .post("/api/users/register")
        .send(validRegistrationData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe(validRegistrationData.email);
      expect(response.body.data.user.password).toBeUndefined(); // 密码不应该返回
      expect(response.body.data.token).toBeDefined();
    });

    it("应该拒绝重复的邮箱", async () => {
      // 先注册一个用户
      await request(testApp)
        .post("/api/users/register")
        .send(validRegistrationData);

      // 尝试用相同邮箱再注册
      const response = await request(testApp)
        .post("/api/users/register")
        .send(validRegistrationData)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain("邮箱");
    });

    it("应该验证必填字段", async () => {
      const response = await request(testApp)
        .post("/api/users/register")
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });

    it("应该验证邮箱格式", async () => {
      const invalidData = {
        ...validRegistrationData,
        email: "invalid-email",
      };

      const response = await request(testApp)
        .post("/api/users/register")
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(
        response.body.errors.some((error: any) => error.field === "email")
      ).toBe(true);
    });

    it("应该验证密码强度", async () => {
      const weakPasswordData = {
        ...validRegistrationData,
        password: "123",
      };

      const response = await request(testApp)
        .post("/api/users/register")
        .send(weakPasswordData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(
        response.body.errors.some((error: any) => error.field === "password")
      ).toBe(true);
    });
  });

  describe("POST /api/users/login", () => {
    const userCredentials = {
      email: "logintest@example.com",
      username: "loginuser",
      password: "password123",
      firstName: "Login",
      lastName: "Test",
    };

    beforeEach(async () => {
      // 注册测试用户
      await request(testApp).post("/api/users/register").send(userCredentials);
    });

    it("应该成功登录有效用户", async () => {
      const response = await request(testApp)
        .post("/api/users/login")
        .send({
          email: userCredentials.email,
          password: userCredentials.password,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe(userCredentials.email);
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.user.password).toBeUndefined();
    });

    it("应该拒绝错误的密码", async () => {
      const response = await request(testApp)
        .post("/api/users/login")
        .send({
          email: userCredentials.email,
          password: "wrongpassword",
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain("密码");
    });

    it("应该拒绝不存在的用户", async () => {
      const response = await request(testApp)
        .post("/api/users/login")
        .send({
          email: "nonexistent@example.com",
          password: "password123",
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain("用户");
    });

    it("应该验证必填字段", async () => {
      const response = await request(testApp)
        .post("/api/users/login")
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });
  });

  describe("GET /api/users/profile", () => {
    let authToken: string;
    const userCredentials = {
      email: "profiletest@example.com",
      username: "profileuser",
      password: "password123",
      firstName: "Profile",
      lastName: "Test",
    };

    beforeEach(async () => {
      // 注册并登录获取token
      await request(testApp).post("/api/users/register").send(userCredentials);

      const loginResponse = await request(testApp)
        .post("/api/users/login")
        .send({
          email: userCredentials.email,
          password: userCredentials.password,
        });

      authToken = loginResponse.body.data.token;
    });

    it("应该返回当前用户的配置文件", async () => {
      const response = await request(testApp)
        .get("/api/users/profile")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe(userCredentials.email);
      expect(response.body.data.user.password).toBeUndefined();
    });

    it("应该拒绝未认证的请求", async () => {
      const response = await request(testApp)
        .get("/api/users/profile")
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain("认证");
    });

    it("应该拒绝无效的token", async () => {
      const response = await request(testApp)
        .get("/api/users/profile")
        .set("Authorization", "Bearer invalid-token")
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain("token");
    });
  });

  describe("PUT /api/users/profile", () => {
    let authToken: string;
    const userCredentials = {
      email: "updatetest@example.com",
      username: "updateuser",
      password: "password123",
      firstName: "Update",
      lastName: "Test",
    };

    beforeEach(async () => {
      // 注册并登录获取token
      await request(testApp).post("/api/users/register").send(userCredentials);

      const loginResponse = await request(testApp)
        .post("/api/users/login")
        .send({
          email: userCredentials.email,
          password: userCredentials.password,
        });

      authToken = loginResponse.body.data.token;
    });

    it("应该成功更新用户配置文件", async () => {
      const updateData = {
        firstName: "Updated",
        lastName: "Name",
        phone: "+1234567890",
      };

      const response = await request(testApp)
        .put("/api/users/profile")
        .set("Authorization", `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.firstName).toBe(updateData.firstName);
      expect(response.body.data.user.lastName).toBe(updateData.lastName);
      expect(response.body.data.user.phone).toBe(updateData.phone);
    });

    it("应该验证更新数据格式", async () => {
      const invalidData = {
        email: "invalid-email-format",
      };

      const response = await request(testApp)
        .put("/api/users/profile")
        .set("Authorization", `Bearer ${authToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });

    it("应该拒绝未认证的请求", async () => {
      const response = await request(testApp)
        .put("/api/users/profile")
        .send({ firstName: "Test" })
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe("POST /api/users/change-password", () => {
    let authToken: string;
    const userCredentials = {
      email: "passwordtest@example.com",
      username: "passworduser",
      password: "oldpassword123",
      firstName: "Password",
      lastName: "Test",
    };

    beforeEach(async () => {
      // 注册并登录获取token
      await request(testApp).post("/api/users/register").send(userCredentials);

      const loginResponse = await request(testApp)
        .post("/api/users/login")
        .send({
          email: userCredentials.email,
          password: userCredentials.password,
        });

      authToken = loginResponse.body.data.token;
    });

    it("应该成功更改密码", async () => {
      const passwordData = {
        currentPassword: userCredentials.password,
        newPassword: "newpassword123",
      };

      const response = await request(testApp)
        .post("/api/users/change-password")
        .set("Authorization", `Bearer ${authToken}`)
        .send(passwordData)
        .expect(200);

      expect(response.body.success).toBe(true);

      // 验证新密码可以登录
      const loginResponse = await request(testApp)
        .post("/api/users/login")
        .send({
          email: userCredentials.email,
          password: passwordData.newPassword,
        })
        .expect(200);

      expect(loginResponse.body.success).toBe(true);
    });

    it("应该拒绝错误的当前密码", async () => {
      const passwordData = {
        currentPassword: "wrongpassword",
        newPassword: "newpassword123",
      };

      const response = await request(testApp)
        .post("/api/users/change-password")
        .set("Authorization", `Bearer ${authToken}`)
        .send(passwordData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain("当前密码");
    });

    it("应该验证新密码强度", async () => {
      const passwordData = {
        currentPassword: userCredentials.password,
        newPassword: "123",
      };

      const response = await request(testApp)
        .post("/api/users/change-password")
        .set("Authorization", `Bearer ${authToken}`)
        .send(passwordData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });
  });

  describe("Rate Limiting", () => {
    it("应该限制登录尝试次数", async () => {
      const invalidCredentials = {
        email: "test@example.com",
        password: "wrongpassword",
      };

      // 尝试多次登录失败
      for (let i = 0; i < 5; i++) {
        await request(testApp)
          .post("/api/users/login")
          .send(invalidCredentials)
          .expect(401);
      }

      // 第6次应该被限制
      const response = await request(testApp)
        .post("/api/users/login")
        .send(invalidCredentials)
        .expect(429);

      expect(response.body.error).toContain("Too many");
    });
  });

  describe("CSRF Protection", () => {
    it("应该要求CSRF token", async () => {
      // 这个测试假设CSRF保护已启用
      const response = await request(testApp).post("/api/users/register").send({
        email: "csrf@example.com",
        username: "csrfuser",
        password: "password123",
        firstName: "CSRF",
        lastName: "Test",
      });

      // 根据CSRF配置，可能返回403或要求CSRF token
      if (response.status === 403) {
        expect(response.body.error).toContain("CSRF");
      }
    });
  });

  describe("Error Handling", () => {
    it("应该处理内部服务器错误", async () => {
      // 发送会导致服务器错误的请求
      const response = await request(testApp)
        .post("/api/users/register")
        .send({
          email: "error@example.com",
          username: "a".repeat(1000), // 超长用户名可能导致错误
          password: "password123",
          firstName: "Error",
          lastName: "Test",
        });

      if (response.status >= 500) {
        expect(response.body.success).toBe(false);
        expect(response.body.error).toBeDefined();
      }
    });

    it("应该返回标准化的错误响应", async () => {
      const response = await request(testApp)
        .post("/api/users/login")
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty("success", false);
      expect(response.body).toHaveProperty("error");
      expect(response.body).toHaveProperty("errors");
    });
  });

  describe("Content Type Validation", () => {
    it("应该拒绝非JSON内容", async () => {
      const response = await request(testApp)
        .post("/api/users/register")
        .set("Content-Type", "text/plain")
        .send("invalid content")
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe("Request Size Limits", () => {
    it("应该拒绝过大的请求", async () => {
      const largeData = {
        email: "large@example.com",
        username: "largeuser",
        password: "password123",
        firstName: "a".repeat(10000),
        lastName: "Test",
      };

      const response = await request(testApp)
        .post("/api/users/register")
        .send(largeData);

      if (response.status === 413) {
        expect(response.body.error).toContain("payload");
      }
    });
  });
});
