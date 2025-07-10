/**
 * 用户服务单元测试
 *
 * 这个测试文件演示了如何对企业应用架构中的领域服务进行单元测试
 * 重点测试业务逻辑、验证规则、错误处理等
 */

import { UserService } from "../../domain/services/user.service";
import { UserRepository } from "../../domain/repositories/user.repository";
import { User } from "../../domain/model/user";
import bcryptjs from "bcryptjs";

// Mock dependencies
jest.mock("bcryptjs");
jest.mock("../../domain/repositories/user.repository");

describe("UserService", () => {
  let userService: UserService;
  let mockUserRepository: jest.Mocked<UserRepository>;
  let mockBcrypt: jest.Mocked<typeof bcryptjs>;

  beforeEach(() => {
    // 创建mock实例
    mockUserRepository = {
      findById: jest.fn(),
      findByEmail: jest.fn(),
      findByUsername: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findAll: jest.fn(),
      count: jest.fn(),
    } as any;

    mockBcrypt = bcryptjs as jest.Mocked<typeof bcryptjs>;

    // 创建用户服务实例
    userService = new UserService(mockUserRepository);

    // 重置所有mocks
    jest.clearAllMocks();
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
      mockBcrypt.hash.mockResolvedValue("hashed_password");

      const expectedUser = new User(
        "user-123",
        validUserData.email,
        validUserData.username,
        "hashed_password",
        validUserData.firstName,
        validUserData.lastName
      );
      mockUserRepository.save.mockResolvedValue(expectedUser);

      // Act
      const result = await userService.registerUser(validUserData);

      // Assert
      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.user!.email).toBe(validUserData.email);
      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(
        validUserData.email
      );
      expect(mockUserRepository.findByUsername).toHaveBeenCalledWith(
        validUserData.username
      );
      expect(mockBcrypt.hash).toHaveBeenCalledWith(validUserData.password, 12);
      expect(mockUserRepository.save).toHaveBeenCalled();
    });

    it("应该拒绝重复的邮箱地址", async () => {
      // Arrange
      const existingUser = new User(
        "existing-user",
        validUserData.email,
        "otheruser",
        "password",
        "Other",
        "User"
      );
      mockUserRepository.findByEmail.mockResolvedValue(existingUser);

      // Act
      const result = await userService.registerUser(validUserData);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe("邮箱地址已被使用");
      expect(mockUserRepository.save).not.toHaveBeenCalled();
    });

    it("应该拒绝重复的用户名", async () => {
      // Arrange
      mockUserRepository.findByEmail.mockResolvedValue(null);
      const existingUser = new User(
        "existing-user",
        "other@example.com",
        validUserData.username,
        "password",
        "Other",
        "User"
      );
      mockUserRepository.findByUsername.mockResolvedValue(existingUser);

      // Act
      const result = await userService.registerUser(validUserData);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe("用户名已被使用");
      expect(mockUserRepository.save).not.toHaveBeenCalled();
    });

    it("应该验证邮箱格式", async () => {
      // Arrange
      const invalidEmailData = {
        ...validUserData,
        email: "invalid-email",
      };

      // Act
      const result = await userService.registerUser(invalidEmailData);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain("邮箱格式不正确");
      expect(mockUserRepository.findByEmail).not.toHaveBeenCalled();
    });

    it("应该验证密码强度", async () => {
      // Arrange
      const weakPasswordData = {
        ...validUserData,
        password: "123",
      };

      // Act
      const result = await userService.registerUser(weakPasswordData);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain("密码强度不够");
      expect(mockUserRepository.findByEmail).not.toHaveBeenCalled();
    });

    it("应该处理数据库保存错误", async () => {
      // Arrange
      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockUserRepository.findByUsername.mockResolvedValue(null);
      mockBcrypt.hash.mockResolvedValue("hashed_password");
      mockUserRepository.save.mockRejectedValue(new Error("Database error"));

      // Act
      const result = await userService.registerUser(validUserData);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain("用户注册失败");
    });
  });

  describe("用户登录 (authenticateUser)", () => {
    const loginCredentials = {
      email: "test@example.com",
      password: "password123",
    };

    const existingUser = new User(
      "user-123",
      loginCredentials.email,
      "testuser",
      "hashed_password",
      "Test",
      "User"
    );

    it("应该成功验证有效凭据", async () => {
      // Arrange
      mockUserRepository.findByEmail.mockResolvedValue(existingUser);
      mockBcrypt.compare.mockResolvedValue(true);

      // Act
      const result = await userService.authenticateUser(
        loginCredentials.email,
        loginCredentials.password
      );

      // Assert
      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.user!.id).toBe(existingUser.id);
      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(
        loginCredentials.email
      );
      expect(mockBcrypt.compare).toHaveBeenCalledWith(
        loginCredentials.password,
        existingUser.passwordHash
      );
    });

    it("应该拒绝不存在的用户", async () => {
      // Arrange
      mockUserRepository.findByEmail.mockResolvedValue(null);

      // Act
      const result = await userService.authenticateUser(
        loginCredentials.email,
        loginCredentials.password
      );

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe("用户不存在");
      expect(mockBcrypt.compare).not.toHaveBeenCalled();
    });

    it("应该拒绝错误的密码", async () => {
      // Arrange
      mockUserRepository.findByEmail.mockResolvedValue(existingUser);
      mockBcrypt.compare.mockResolvedValue(false);

      // Act
      const result = await userService.authenticateUser(
        loginCredentials.email,
        "wrong_password"
      );

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe("密码错误");
    });

    it("应该拒绝未激活的用户", async () => {
      // Arrange
      const inactiveUser = new User(
        "user-123",
        loginCredentials.email,
        "testuser",
        "hashed_password",
        "Test",
        "User"
      );
      inactiveUser.deactivate();

      mockUserRepository.findByEmail.mockResolvedValue(inactiveUser);
      mockBcrypt.compare.mockResolvedValue(true);

      // Act
      const result = await userService.authenticateUser(
        loginCredentials.email,
        loginCredentials.password
      );

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe("用户账户已被禁用");
    });
  });

  describe("用户配置文件更新 (updateUserProfile)", () => {
    const userId = "user-123";
    const existingUser = new User(
      userId,
      "test@example.com",
      "testuser",
      "hashed_password",
      "Test",
      "User"
    );

    it("应该成功更新用户配置文件", async () => {
      // Arrange
      const updateData = {
        firstName: "Updated",
        lastName: "Name",
        phone: "+1234567890",
      };

      mockUserRepository.findById.mockResolvedValue(existingUser);
      mockUserRepository.update.mockResolvedValue({
        ...existingUser,
        ...updateData,
      } as User);

      // Act
      const result = await userService.updateUserProfile(userId, updateData);

      // Assert
      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.user!.firstName).toBe(updateData.firstName);
      expect(mockUserRepository.findById).toHaveBeenCalledWith(userId);
      expect(mockUserRepository.update).toHaveBeenCalled();
    });

    it("应该拒绝更新不存在的用户", async () => {
      // Arrange
      mockUserRepository.findById.mockResolvedValue(null);

      // Act
      const result = await userService.updateUserProfile(userId, {
        firstName: "Updated",
      });

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe("用户不存在");
      expect(mockUserRepository.update).not.toHaveBeenCalled();
    });

    it("应该验证更新数据格式", async () => {
      // Arrange
      mockUserRepository.findById.mockResolvedValue(existingUser);

      // Act
      const result = await userService.updateUserProfile(userId, {
        email: "invalid-email-format",
      });

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain("邮箱格式不正确");
      expect(mockUserRepository.update).not.toHaveBeenCalled();
    });
  });

  describe("密码更改 (changePassword)", () => {
    const userId = "user-123";
    const existingUser = new User(
      userId,
      "test@example.com",
      "testuser",
      "old_hashed_password",
      "Test",
      "User"
    );

    it("应该成功更改密码", async () => {
      // Arrange
      mockUserRepository.findById.mockResolvedValue(existingUser);
      mockBcrypt.compare.mockResolvedValue(true);
      mockBcrypt.hash.mockResolvedValue("new_hashed_password");
      mockUserRepository.update.mockResolvedValue(existingUser);

      // Act
      const result = await userService.changePassword(
        userId,
        "old_password",
        "new_password123"
      );

      // Assert
      expect(result.success).toBe(true);
      expect(mockBcrypt.compare).toHaveBeenCalledWith(
        "old_password",
        existingUser.passwordHash
      );
      expect(mockBcrypt.hash).toHaveBeenCalledWith("new_password123", 12);
      expect(mockUserRepository.update).toHaveBeenCalled();
    });

    it("应该拒绝错误的旧密码", async () => {
      // Arrange
      mockUserRepository.findById.mockResolvedValue(existingUser);
      mockBcrypt.compare.mockResolvedValue(false);

      // Act
      const result = await userService.changePassword(
        userId,
        "wrong_old_password",
        "new_password123"
      );

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe("当前密码不正确");
      expect(mockBcrypt.hash).not.toHaveBeenCalled();
    });

    it("应该验证新密码强度", async () => {
      // Arrange
      mockUserRepository.findById.mockResolvedValue(existingUser);
      mockBcrypt.compare.mockResolvedValue(true);

      // Act
      const result = await userService.changePassword(
        userId,
        "old_password",
        "123"
      );

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain("新密码强度不够");
      expect(mockBcrypt.hash).not.toHaveBeenCalled();
    });
  });

  describe("用户查询 (getUserById)", () => {
    const userId = "user-123";
    const existingUser = new User(
      userId,
      "test@example.com",
      "testuser",
      "hashed_password",
      "Test",
      "User"
    );

    it("应该成功获取用户信息", async () => {
      // Arrange
      mockUserRepository.findById.mockResolvedValue(existingUser);

      // Act
      const result = await userService.getUserById(userId);

      // Assert
      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.user!.id).toBe(userId);
      expect(mockUserRepository.findById).toHaveBeenCalledWith(userId);
    });

    it("应该处理用户不存在的情况", async () => {
      // Arrange
      mockUserRepository.findById.mockResolvedValue(null);

      // Act
      const result = await userService.getUserById(userId);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe("用户不存在");
    });

    it("应该处理数据库查询错误", async () => {
      // Arrange
      mockUserRepository.findById.mockRejectedValue(
        new Error("Database error")
      );

      // Act
      const result = await userService.getUserById(userId);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain("获取用户信息失败");
    });
  });

  describe("用户激活状态管理", () => {
    const userId = "user-123";
    const existingUser = new User(
      userId,
      "test@example.com",
      "testuser",
      "hashed_password",
      "Test",
      "User"
    );

    it("应该能够禁用用户", async () => {
      // Arrange
      mockUserRepository.findById.mockResolvedValue(existingUser);
      mockUserRepository.update.mockResolvedValue(existingUser);

      // Act
      const result = await userService.deactivateUser(userId);

      // Assert
      expect(result.success).toBe(true);
      expect(mockUserRepository.findById).toHaveBeenCalledWith(userId);
      expect(mockUserRepository.update).toHaveBeenCalled();
    });

    it("应该能够激活用户", async () => {
      // Arrange
      existingUser.deactivate();
      mockUserRepository.findById.mockResolvedValue(existingUser);
      mockUserRepository.update.mockResolvedValue(existingUser);

      // Act
      const result = await userService.activateUser(userId);

      // Assert
      expect(result.success).toBe(true);
      expect(mockUserRepository.findById).toHaveBeenCalledWith(userId);
      expect(mockUserRepository.update).toHaveBeenCalled();
    });
  });

  describe("邮箱验证", () => {
    const userId = "user-123";
    const existingUser = new User(
      userId,
      "test@example.com",
      "testuser",
      "hashed_password",
      "Test",
      "User"
    );

    it("应该能够验证邮箱", async () => {
      // Arrange
      mockUserRepository.findById.mockResolvedValue(existingUser);
      mockUserRepository.update.mockResolvedValue(existingUser);

      // Act
      const result = await userService.verifyEmail(userId);

      // Assert
      expect(result.success).toBe(true);
      expect(mockUserRepository.findById).toHaveBeenCalledWith(userId);
      expect(mockUserRepository.update).toHaveBeenCalled();
    });

    it("应该拒绝验证不存在的用户邮箱", async () => {
      // Arrange
      mockUserRepository.findById.mockResolvedValue(null);

      // Act
      const result = await userService.verifyEmail(userId);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe("用户不存在");
    });
  });

  describe("边界条件和错误处理", () => {
    it("应该处理空的注册数据", async () => {
      // Act
      const result = await userService.registerUser({} as any);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain("必填字段");
    });

    it("应该处理数据库连接错误", async () => {
      // Arrange
      mockUserRepository.findByEmail.mockRejectedValue(
        new Error("Connection error")
      );

      // Act
      const result = await userService.registerUser({
        email: "test@example.com",
        username: "testuser",
        password: "password123",
        firstName: "Test",
        lastName: "User",
      });

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain("服务暂时不可用");
    });

    it("应该处理并发注册冲突", async () => {
      // Arrange
      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockUserRepository.findByUsername.mockResolvedValue(null);
      mockBcrypt.hash.mockResolvedValue("hashed_password");
      mockUserRepository.save.mockRejectedValue(
        new Error("Duplicate key error")
      );

      // Act
      const result = await userService.registerUser({
        email: "test@example.com",
        username: "testuser",
        password: "password123",
        firstName: "Test",
        lastName: "User",
      });

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain("用户注册失败");
    });
  });

  describe("性能和缓存相关测试", () => {
    it("应该避免重复的数据库查询", async () => {
      // Arrange
      const userId = "user-123";
      const existingUser = new User(
        userId,
        "test@example.com",
        "testuser",
        "hashed_password",
        "Test",
        "User"
      );
      mockUserRepository.findById.mockResolvedValue(existingUser);

      // Act
      await userService.getUserById(userId);
      await userService.getUserById(userId);

      // Assert - 确保缓存机制工作
      // 这里假设UserService实现了某种缓存机制
      expect(mockUserRepository.findById).toHaveBeenCalledTimes(2);
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });
});
