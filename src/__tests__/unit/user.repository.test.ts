/**
 * 用户仓储单元测试
 * 
 * 测试数据访问层的用户仓储实现
 */

import { UserRepositoryImpl } from "../../data/repositories/user.repository.impl";
import { User } from "../../domain/model/user";
import { AppDataSource } from "../../infrastructure/database/data-source";
import { User as UserEntity } from "../../infrastructure/database/entities/user.entity";
import { Repository } from "typeorm";
import { UserTestData } from "../helpers/user-test-data";

// Mock TypeORM
jest.mock("../../infrastructure/database/data-source");
jest.mock("typeorm");

describe("UserRepositoryImpl", () => {
  let userRepository: UserRepositoryImpl;
  let mockEntityRepository: jest.Mocked<Repository<UserEntity>>;

  beforeEach(() => {
    // 创建mock的TypeORM repository
    mockEntityRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
    } as any;

    // Mock AppDataSource.getRepository
    (AppDataSource.getRepository as jest.Mock).mockReturnValue(mockEntityRepository);

    userRepository = new UserRepositoryImpl();
    jest.clearAllMocks();
  });

  describe("findById", () => {
    it("应该根据ID查找用户", async () => {
      // Arrange
      const userId = "user-123";
      const userEntity = UserTestData.createUserEntity({ id: userId });
      mockEntityRepository.findOne.mockResolvedValue(userEntity);

      // Act
      const result = await userRepository.findById(userId);

      // Assert
      expect(mockEntityRepository.findOne).toHaveBeenCalledWith({
        where: { id: userId }
      });
      expect(result).toBeInstanceOf(User);
      expect(result?.getId()).toBe(userId);
      expect(result?.getEmail()).toBe(userEntity.email);
    });

    it("当用户不存在时应该返回null", async () => {
      // Arrange
      const userId = "non-existent-user";
      mockEntityRepository.findOne.mockResolvedValue(null);

      // Act
      const result = await userRepository.findById(userId);

      // Assert
      expect(mockEntityRepository.findOne).toHaveBeenCalledWith({
        where: { id: userId }
      });
      expect(result).toBeNull();
    });

    it("当数据库查询失败时应该抛出异常", async () => {
      // Arrange
      const userId = "user-123";
      const dbError = new Error("Database connection failed");
      mockEntityRepository.findOne.mockRejectedValue(dbError);

      // Act & Assert
      await expect(userRepository.findById(userId)).rejects.toThrow("Database connection failed");
    });
  });

  describe("findByEmail", () => {
    it("应该根据邮箱查找用户", async () => {
      // Arrange
      const email = "test@example.com";
      const userEntity = UserTestData.createUserEntity({ email });
      mockEntityRepository.findOne.mockResolvedValue(userEntity);

      // Act
      const result = await userRepository.findByEmail(email);

      // Assert
      expect(mockEntityRepository.findOne).toHaveBeenCalledWith({
        where: { email }
      });
      expect(result).toBeInstanceOf(User);
      expect(result?.getEmail()).toBe(email);
    });

    it("应该在邮箱不存在时返回null", async () => {
      // Arrange
      mockEntityRepository.findOne.mockResolvedValue(null);

      // Act
      const result = await userRepository.findByEmail("nonexistent@example.com");

      // Assert
      expect(result).toBeNull();
    });
  });

  describe("findByUsername", () => {
    it("应该根据用户名查找用户", async () => {
      // Arrange
      const username = "testuser";
      const userEntity = UserTestData.createUserEntity({ username });
      mockEntityRepository.findOne.mockResolvedValue(userEntity);

      // Act
      const result = await userRepository.findByUsername(username);

      // Assert
      expect(result).toBeInstanceOf(User);
      expect(result?.getUsername()).toBe(username);
      expect(mockEntityRepository.findOne).toHaveBeenCalledWith({
        where: { username }
      });
    });
  });

  describe("save", () => {
    it("应该保存新用户", async () => {
      // Arrange
      const user = UserTestData.createUser({ id: "user-123" });
      const savedEntity = UserTestData.createUserEntity({ id: "user-123" });

      mockEntityRepository.create.mockReturnValue(savedEntity);
      mockEntityRepository.save.mockResolvedValue(savedEntity);

      // Act
      const result = await userRepository.save(user);

      // Assert
      expect(result).toBeInstanceOf(User);
      expect(result.getId()).toBe(user.getId());
      expect(mockEntityRepository.create).toHaveBeenCalled();
      expect(mockEntityRepository.save).toHaveBeenCalled();
    });

    it("应该处理保存错误", async () => {
      // Arrange
      const user = UserTestData.createUser();
      mockEntityRepository.create.mockReturnValue({} as UserEntity);
      mockEntityRepository.save.mockRejectedValue(new Error("Save failed"));

      // Act & Assert
      await expect(userRepository.save(user)).rejects.toThrow("Save failed");
    });
  });

  describe("update", () => {
    it("应该更新现有用户", async () => {
      // Arrange
      const user = UserTestData.createUser({ 
        id: "user-123", 
        firstName: "Updated" 
      });
      const updatedEntity = UserTestData.createUserEntity({ 
        id: "user-123", 
        firstName: "Updated" 
      });

      mockEntityRepository.update.mockResolvedValue({ affected: 1 } as any);
      mockEntityRepository.findOne.mockResolvedValue(updatedEntity);

      // Act
      const result = await userRepository.update(user);

      // Assert
      expect(result).toBeInstanceOf(User);
      expect(result.getFirstName()).toBe("Updated");
      expect(mockEntityRepository.update).toHaveBeenCalledWith(
        user.getId(),
        expect.any(Object)
      );
    });

    it("应该在用户不存在时抛出错误", async () => {
      // Arrange
      const user = UserTestData.createUser({ id: "non-existent" });
      mockEntityRepository.update.mockResolvedValue({ affected: 0 } as any);

      // Act & Assert
      await expect(userRepository.update(user)).rejects.toThrow("User not found");
    });
  });

  describe("delete", () => {
    it("应该删除用户", async () => {
      // Arrange
      const userId = "user-123";
      mockEntityRepository.delete.mockResolvedValue({ affected: 1 } as any);

      // Act
      await userRepository.delete(userId);

      // Assert
      expect(mockEntityRepository.delete).toHaveBeenCalledWith(userId);
    });

    it("应该在用户不存在时抛出错误", async () => {
      // Arrange
      const userId = "non-existent";
      mockEntityRepository.delete.mockResolvedValue({ affected: 0 } as any);

      // Act & Assert
      await expect(userRepository.delete(userId)).rejects.toThrow("User not found");
    });
  });

  describe("findAll", () => {
    it("应该返回所有用户", async () => {
      // Arrange
      const userEntities = UserTestData.createUserEntityList(2);
      mockEntityRepository.find.mockResolvedValue(userEntities);

      // Act
      const result = await userRepository.findAll();

      // Assert
      expect(mockEntityRepository.find).toHaveBeenCalled();
      expect(result).toHaveLength(2);
      expect(result[0]).toBeInstanceOf(User);
      expect(result[1]).toBeInstanceOf(User);
      expect(result[0].getId()).toBe("user-1");
      expect(result[1].getId()).toBe("user-2");
    });

    it("应该支持分页查询", async () => {
      // Arrange
      const userEntities = [] as UserEntity[];
      mockEntityRepository.find.mockResolvedValue(userEntities);

      // Act
      const result = await userRepository.findAll(0, 10);

      // Assert
      expect(mockEntityRepository.find).toHaveBeenCalledWith({
        skip: 0,
        take: 10,
      });
    });
  });

  describe("count", () => {
    it("应该返回用户总数", async () => {
      // Arrange
      mockEntityRepository.count.mockResolvedValue(42);

      // Act
      const result = await userRepository.count();

      // Assert
      expect(mockEntityRepository.count).toHaveBeenCalled();
      expect(result).toBe(42);
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });
});