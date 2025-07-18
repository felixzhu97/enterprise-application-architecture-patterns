/**
 * 用户服务单元测试
 *
 * 这个测试文件演示了如何对企业应用架构中的领域服务进行单元测试
 * 重点测试业务逻辑、验证规则、错误处理等
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { UserDomainService } from "../../domain/services/user.service";
import { UserRepository } from "../../domain/repositories/user.repository";
import { User, UserProfile } from "../../domain/model/user";
import { EmailService } from "../../patterns/base/separated-interface";

// Mock dependencies
vi.mock("../../domain/repositories/user.repository");
vi.mock("../../patterns/base/separated-interface");

describe("UserDomainService", () => {
  let userService: UserDomainService;
  let mockUserRepository: any;
  let mockEmailService: any;

  beforeEach(() => {
    // 创建mock实例
    mockUserRepository = {
      findById: vi.fn(),
      findByEmail: vi.fn(),
      findByUsername: vi.fn(),
      save: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      findAll: vi.fn(),
      count: vi.fn(),
    };

    mockEmailService = {
      sendPasswordReset: vi.fn(),
      sendWelcomeEmail: vi.fn(),
    };

    // 创建用户服务实例
    userService = new UserDomainService(mockUserRepository, mockEmailService);

    // 重置所有mocks
    vi.clearAllMocks();
  });

  describe("用户注册 (registerUser)", () => {
    const validUserData = {
      email: "test@example.com",
      username: "testuser",
      password: "password123",
      firstName: "Test",
      lastName: "User",
    };

    it("应该成功注册新用户", async () => {
      // Arrange
      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockUserRepository.findByUsername.mockResolvedValue(null);

      const expectedUser = new User(
        validUserData.username,
        validUserData.email,
        validUserData.password,
        new UserProfile(validUserData.firstName, validUserData.lastName)
      );
      mockUserRepository.save.mockResolvedValue(expectedUser);
      mockEmailService.sendWelcomeEmail.mockResolvedValue(undefined);

      // Act
      const result = await userService.registerUser(validUserData);

      // Assert
      expect(result).toBeDefined();
      expect(result.email).toBe(validUserData.email);
      expect(result.username).toBe(validUserData.username);
      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(
        validUserData.email
      );
      expect(mockUserRepository.findByUsername).toHaveBeenCalledWith(
        validUserData.username
      );
      expect(mockUserRepository.save).toHaveBeenCalled();
      expect(mockEmailService.sendWelcomeEmail).toHaveBeenCalled();
    });

    it("应该拒绝重复的邮箱地址", async () => {
      // Arrange
      const existingUser = new User(
        "otheruser",
        validUserData.email,
        "password",
        new UserProfile("Other", "User")
      );
      mockUserRepository.findByEmail.mockResolvedValue(existingUser);

      // Act & Assert
      await expect(userService.registerUser(validUserData)).rejects.toThrow();
      expect(mockUserRepository.save).not.toHaveBeenCalled();
    });

    it("应该拒绝重复的用户名", async () => {
      // Arrange
      mockUserRepository.findByEmail.mockResolvedValue(null);
      const existingUser = new User(
        validUserData.username,
        "other@example.com",
        "password",
        new UserProfile("Other", "User")
      );
      mockUserRepository.findByUsername.mockResolvedValue(existingUser);

      // Act & Assert
      await expect(userService.registerUser(validUserData)).rejects.toThrow();
      expect(mockUserRepository.save).not.toHaveBeenCalled();
    });
  });

  describe("用户认证 (authenticateUser)", () => {
    const loginCredentials = {
      username: "testuser",
      password: "password123",
    };

    const existingUser = new User(
      loginCredentials.username,
      "test@example.com",
      loginCredentials.password,
      new UserProfile("Test", "User")
    );

    it("应该成功验证有效凭据", async () => {
      // Arrange
      // 设置用户为已验证邮箱状态
      (existingUser as any)._emailVerified = true;
      mockUserRepository.findByUsername.mockResolvedValue(existingUser);
      mockUserRepository.save.mockResolvedValue(existingUser);

      // Act
      const result = await userService.authenticateUser(
        loginCredentials.username,
        loginCredentials.password
      );

      // Assert
      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.user!.username).toBe(existingUser.username);
    });

    it("应该拒绝不存在的用户", async () => {
      // Arrange
      mockUserRepository.findByUsername.mockResolvedValue(null);

      // Act
      const result = await userService.authenticateUser(
        loginCredentials.username,
        loginCredentials.password
      );

      // Assert
      expect(result.success).toBe(false);
      expect(result.message).toBe("用户名或密码错误");
    });

    it("应该拒绝错误的密码", async () => {
      // Arrange
      mockUserRepository.findByUsername.mockResolvedValue(existingUser);
      mockUserRepository.save.mockResolvedValue(existingUser);

      // Act
      const result = await userService.authenticateUser(
        loginCredentials.username,
        "wrong_password"
      );

      // Assert
      expect(result.success).toBe(false);
      expect(result.message).toBe("用户名或密码错误");
    });
  });

  describe("密码重置 (resetPassword)", () => {
    it("应该发送密码重置邮件", async () => {
      // Arrange
      const email = "test@example.com";
      const existingUser = new User(
        "testuser",
        email,
        "password",
        new UserProfile("Test", "User")
      );
      mockUserRepository.findByEmail.mockResolvedValue(existingUser);
      mockEmailService.sendPasswordReset.mockResolvedValue(undefined);

      // Act
      await userService.resetPassword(email);

      // Assert
      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(email);
      expect(mockEmailService.sendPasswordReset).toHaveBeenCalled();
    });

    it("应该静默处理不存在的用户", async () => {
      // Arrange
      const email = "nonexistent@example.com";
      mockUserRepository.findByEmail.mockResolvedValue(null);

      // Act
      await userService.resetPassword(email);

      // Assert
      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(email);
      expect(mockEmailService.sendPasswordReset).not.toHaveBeenCalled();
    });
  });
});
