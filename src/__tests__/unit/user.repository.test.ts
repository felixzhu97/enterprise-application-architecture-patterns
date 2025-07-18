/**
 * 用户仓储单元测试
 *
 * 测试数据访问层的用户仓储实现
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
    // 创建mock的TypeORM repository
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
      const userEntity = new UserEntity();
      userEntity.id = userId;
      userEntity.username = "testuser";
      userEntity.email = "test@example.com";
      userEntity.password_hash = "hashed_password";
      userEntity.first_name = "Test";
      userEntity.last_name = "User";
      userEntity.status = "active";
      userEntity.role = "customer";
      userEntity.email_verified = false;
      userEntity.failed_login_attempts = 0;
      userEntity.version = 1;
      userEntity.created_at = new Date();
      userEntity.updated_at = new Date();

      mockEntityRepository.findOne.mockResolvedValue(userEntity);

      // Act
      const result = await userRepository.findById(userId);

      // Assert
      expect(mockEntityRepository.findOne).toHaveBeenCalledWith({
        where: { id: userId },
      });
      expect(result).toBeInstanceOf(User);
      expect(result?.getId()).toBe(userId);
      expect(result?.email).toBe(userEntity.email);
    });

    it("当用户不存在时应该返回null", async () => {
      // Arrange
      const userId = "non-existent-user";
      mockEntityRepository.findOne.mockResolvedValue(null);

      // Act
      const result = await userRepository.findById(userId);

      // Assert
      expect(mockEntityRepository.findOne).toHaveBeenCalledWith({
        where: { id: userId },
      });
      expect(result).toBeNull();
    });
  });

  describe("findByEmail", () => {
    it("应该根据邮箱查找用户", async () => {
      // Arrange
      const email = "test@example.com";
      const userEntity = new UserEntity();
      userEntity.id = "user-123";
      userEntity.username = "testuser";
      userEntity.email = email;
      userEntity.password_hash = "hashed_password";
      userEntity.first_name = "Test";
      userEntity.last_name = "User";
      userEntity.status = "active";
      userEntity.role = "customer";
      userEntity.email_verified = false;
      userEntity.failed_login_attempts = 0;
      userEntity.version = 1;
      userEntity.created_at = new Date();
      userEntity.updated_at = new Date();

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

    it("应该在邮箱不存在时返回null", async () => {
      // Arrange
      mockEntityRepository.findOne.mockResolvedValue(null);

      // Act
      const result = await userRepository.findByEmail(
        "nonexistent@example.com"
      );

      // Assert
      expect(result).toBeNull();
    });
  });

  describe("findByUsername", () => {
    it("应该根据用户名查找用户", async () => {
      // Arrange
      const username = "testuser";
      const userEntity = new UserEntity();
      userEntity.id = "user-123";
      userEntity.username = username;
      userEntity.email = "test@example.com";
      userEntity.password_hash = "hashed_password";
      userEntity.first_name = "Test";
      userEntity.last_name = "User";
      userEntity.status = "active";
      userEntity.role = "customer";
      userEntity.email_verified = false;
      userEntity.failed_login_attempts = 0;
      userEntity.version = 1;
      userEntity.created_at = new Date();
      userEntity.updated_at = new Date();

      mockEntityRepository.findOne.mockResolvedValue(userEntity);

      // Act
      const result = await userRepository.findByUsername(username);

      // Assert
      expect(result).toBeInstanceOf(User);
      expect(result?.username).toBe(username);
      expect(mockEntityRepository.findOne).toHaveBeenCalledWith({
        where: { username },
      });
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

      const savedEntity = new UserEntity();
      savedEntity.id = "user-123";
      savedEntity.username = "testuser";
      savedEntity.email = "test@example.com";
      savedEntity.password_hash = "hashed_password";
      savedEntity.first_name = "Test";
      savedEntity.last_name = "User";
      savedEntity.status = "active";
      savedEntity.role = "customer";
      savedEntity.email_verified = false;
      savedEntity.failed_login_attempts = 0;
      savedEntity.version = 1;
      savedEntity.created_at = new Date();
      savedEntity.updated_at = new Date();

      mockEntityRepository.save.mockResolvedValue(savedEntity);

      // Act
      const result = await userRepository.save(user);

      // Assert
      expect(result).toBeInstanceOf(User);
      expect(result.getId()).toBe(savedEntity.id);
      expect(mockEntityRepository.save).toHaveBeenCalled();
    });
  });

  describe("findAll", () => {
    it("应该返回所有用户", async () => {
      // Arrange
      const userEntities = [new UserEntity(), new UserEntity()];
      userEntities[0].id = "user-1";
      userEntities[0].username = "user1";
      userEntities[0].email = "user1@example.com";
      userEntities[0].first_name = "User";
      userEntities[0].last_name = "One";
      userEntities[0].status = "active";
      userEntities[0].role = "customer";
      userEntities[0].email_verified = false;
      userEntities[0].failed_login_attempts = 0;
      userEntities[0].version = 1;
      userEntities[0].created_at = new Date();
      userEntities[0].updated_at = new Date();

      userEntities[1].id = "user-2";
      userEntities[1].username = "user2";
      userEntities[1].email = "user2@example.com";
      userEntities[1].first_name = "User";
      userEntities[1].last_name = "Two";
      userEntities[1].status = "active";
      userEntities[1].role = "customer";
      userEntities[1].email_verified = false;
      userEntities[1].failed_login_attempts = 0;
      userEntities[1].version = 1;
      userEntities[1].created_at = new Date();
      userEntities[1].updated_at = new Date();

      mockEntityRepository.find.mockResolvedValue(userEntities);

      // Act
      const result = await userRepository.findAll();

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0]).toBeInstanceOf(User);
      expect(result[1]).toBeInstanceOf(User);
      expect(mockEntityRepository.find).toHaveBeenCalledWith({
        order: { created_at: "DESC" },
      });
    });
  });
});
