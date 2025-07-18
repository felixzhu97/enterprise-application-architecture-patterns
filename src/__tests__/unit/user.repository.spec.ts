/**
 * 用户仓储单元测试 - 重构版本
 *
 * 专注于测试数据访问层的用户仓储实现
 * 使用改进的测试结构和模式
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { TypeORMUserRepository } from "../../data/repositories/user.repository.impl";
import { User, UserProfile } from "../../domain/model/user";
import { AppDataSource } from "../../infrastructure/database/data-source";
import { UserEntity } from "../../infrastructure/database/entities/user.entity";

// Mock TypeORM
vi.mock("../../infrastructure/database/data-source");
vi.mock("typeorm");

describe("TypeORMUserRepository", () => {
  let userRepository: TypeORMUserRepository;
  let mockEntityRepository: any;

  beforeEach(() => {
    // 创建mock repository
    mockEntityRepository = {
      findOne: vi.fn(),
      find: vi.fn(),
      save: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
      createQueryBuilder: vi.fn(),
    };

    // Mock AppDataSource.getRepository
    vi.mocked(AppDataSource.getRepository).mockReturnValue(
      mockEntityRepository
    );

    userRepository = new TypeORMUserRepository();

    // 手动设置repository属性，因为构造函数中的AppDataSource.getRepository调用被mock了
    (userRepository as any).repository = mockEntityRepository;

    vi.clearAllMocks();
  });

  describe("findById", () => {
    it("应该根据ID查找用户", async () => {
      // Arrange
      const userId = "user-123";
      const userEntity = createTestUserEntity(userId);

      mockEntityRepository.findOne.mockResolvedValue(userEntity);

      // Act
      const result = await userRepository.findById(userId);

      // Assert
      expect(mockEntityRepository.findOne).toHaveBeenCalledWith({
        where: { id: userId },
      });
      expect(result).toBeInstanceOf(User);
      expect(result?.getId()).toBe(userId);
    });

    it("当用户不存在时应该返回null", async () => {
      // Arrange
      const userId = "non-existent-user";
      mockEntityRepository.findOne.mockResolvedValue(null);

      // Act
      const result = await userRepository.findById(userId);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe("findByEmail", () => {
    it("应该根据邮箱查找用户", async () => {
      // Arrange
      const email = "test@example.com";
      const userEntity = createTestUserEntity("user-123", email);

      mockEntityRepository.findOne.mockResolvedValue(userEntity);

      // Act
      const result = await userRepository.findByEmail(email);

      // Assert
      expect(mockEntityRepository.findOne).toHaveBeenCalledWith({
        where: { email },
      });
      expect(result).toBeInstanceOf(User);
      expect(result?.email).toBe(email);
    });
  });

  describe("save", () => {
    it("应该保存新用户", async () => {
      // Arrange
      const profile = new UserProfile("Test", "User");
      const user = new User(
        "testuser",
        "test@example.com",
        "password123",
        profile
      );
      const userEntity = createTestUserEntity("user-123");

      mockEntityRepository.save.mockResolvedValue(userEntity);

      // Act
      const result = await userRepository.save(user);

      // Assert
      expect(result).toBeInstanceOf(User);
      expect(mockEntityRepository.save).toHaveBeenCalled();
    });
  });

  // Helper function to create test UserEntity
  function createTestUserEntity(
    id: string,
    email: string = "test@example.com"
  ): UserEntity {
    const entity = new UserEntity();
    entity.id = id;
    entity.username = "testuser";
    entity.email = email;
    entity.password_hash = "hashed_password";
    entity.first_name = "Test";
    entity.last_name = "User";
    entity.phone = null;
    entity.avatar = null;
    entity.date_of_birth = null;
    entity.status = "active";
    entity.role = "customer";
    entity.email_verified = false;
    entity.last_login_at = null;
    entity.failed_login_attempts = 0;
    entity.locked_until = null;
    entity.version = 1;
    entity.created_at = new Date();
    entity.updated_at = new Date();
    return entity;
  }
});
