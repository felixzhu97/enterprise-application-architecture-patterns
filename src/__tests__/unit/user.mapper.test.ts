/**
 * 用户映射器单元测试
 * 
 * 测试领域模型与数据实体之间的映射逻辑
 */

import { UserMapper } from "../../data/mappers/user.mapper";
import { User } from "../../domain/model/user";
import { User as UserEntity } from "../../infrastructure/database/entities/user.entity";

describe("UserMapper", () => {
  describe("toDomain", () => {
    it("应该将数据实体映射为领域模型", () => {
      // Arrange
      const userEntity: UserEntity = {
        id: "user-123",
        email: "test@example.com",
        username: "testuser",
        passwordHash: "hashed_password",
        firstName: "Test",
        lastName: "User",
        phone: "+1234567890",
        isActive: true,
        isEmailVerified: false,
        role: "user",
        lastLoginAt: new Date("2023-01-01"),
        createdAt: new Date("2023-01-01"),
        updatedAt: new Date("2023-01-02"),
      } as UserEntity;

      // Act
      const domainUser = UserMapper.toDomain(userEntity);

      // Assert
      expect(domainUser).toBeInstanceOf(User);
      expect(domainUser.id).toBe(userEntity.id);
      expect(domainUser.email).toBe(userEntity.email);
      expect(domainUser.username).toBe(userEntity.username);
      expect(domainUser.passwordHash).toBe(userEntity.passwordHash);
      expect(domainUser.firstName).toBe(userEntity.firstName);
      expect(domainUser.lastName).toBe(userEntity.lastName);
      expect(domainUser.phone).toBe(userEntity.phone);
      expect(domainUser.isActive).toBe(userEntity.isActive);
      expect(domainUser.isEmailVerified).toBe(userEntity.isEmailVerified);
      expect(domainUser.role).toBe(userEntity.role);
      expect(domainUser.lastLoginAt).toEqual(userEntity.lastLoginAt);
      expect(domainUser.createdAt).toEqual(userEntity.createdAt);
      expect(domainUser.updatedAt).toEqual(userEntity.updatedAt);
    });

    it("应该处理可选字段为null的情况", () => {
      // Arrange
      const userEntity: UserEntity = {
        id: "user-123",
        email: "test@example.com",
        username: "testuser",
        passwordHash: "hashed_password",
        firstName: "Test",
        lastName: "User",
        phone: null,
        isActive: true,
        isEmailVerified: false,
        role: "user",
        lastLoginAt: null,
        createdAt: new Date("2023-01-01"),
        updatedAt: new Date("2023-01-02"),
      } as UserEntity;

      // Act
      const domainUser = UserMapper.toDomain(userEntity);

      // Assert
      expect(domainUser.phone).toBeNull();
      expect(domainUser.lastLoginAt).toBeNull();
    });

    it("应该处理空实体", () => {
      // Act & Assert
      expect(() => UserMapper.toDomain(null as any)).toThrow();
    });
  });

  describe("toEntity", () => {
    it("应该将领域模型映射为数据实体", () => {
      // Arrange
      const domainUser = new User(
        "user-123",
        "test@example.com",
        "testuser",
        "hashed_password",
        "Test",
        "User"
      );
      domainUser.phone = "+1234567890";
      domainUser.role = "admin";
      domainUser.lastLoginAt = new Date("2023-01-01");

      // Act
      const userEntity = UserMapper.toEntity(domainUser);

      // Assert
      expect(userEntity.id).toBe(domainUser.id);
      expect(userEntity.email).toBe(domainUser.email);
      expect(userEntity.username).toBe(domainUser.username);
      expect(userEntity.passwordHash).toBe(domainUser.passwordHash);
      expect(userEntity.firstName).toBe(domainUser.firstName);
      expect(userEntity.lastName).toBe(domainUser.lastName);
      expect(userEntity.phone).toBe(domainUser.phone);
      expect(userEntity.isActive).toBe(domainUser.isActive);
      expect(userEntity.isEmailVerified).toBe(domainUser.isEmailVerified);
      expect(userEntity.role).toBe(domainUser.role);
      expect(userEntity.lastLoginAt).toEqual(domainUser.lastLoginAt);
      expect(userEntity.createdAt).toEqual(domainUser.createdAt);
      expect(userEntity.updatedAt).toEqual(domainUser.updatedAt);
    });

    it("应该处理可选字段为null的情况", () => {
      // Arrange
      const domainUser = new User(
        "user-123",
        "test@example.com",
        "testuser",
        "hashed_password",
        "Test",
        "User"
      );
      // phone和lastLoginAt默认为null

      // Act
      const userEntity = UserMapper.toEntity(domainUser);

      // Assert
      expect(userEntity.phone).toBeNull();
      expect(userEntity.lastLoginAt).toBeNull();
    });

    it("应该处理空领域模型", () => {
      // Act & Assert
      expect(() => UserMapper.toEntity(null as any)).toThrow();
    });
  });

  describe("toDomainList", () => {
    it("应该将实体数组映射为领域模型数组", () => {
      // Arrange
      const userEntities: UserEntity[] = [
        {
          id: "user-1",
          email: "user1@example.com",
          username: "user1",
          passwordHash: "hash1",
          firstName: "User",
          lastName: "One",
          phone: null,
          isActive: true,
          isEmailVerified: false,
          role: "user",
          lastLoginAt: null,
          createdAt: new Date("2023-01-01"),
          updatedAt: new Date("2023-01-01"),
        },
        {
          id: "user-2",
          email: "user2@example.com",
          username: "user2",
          passwordHash: "hash2",
          firstName: "User",
          lastName: "Two",
          phone: "+1234567890",
          isActive: true,
          isEmailVerified: true,
          role: "admin",
          lastLoginAt: new Date("2023-01-02"),
          createdAt: new Date("2023-01-01"),
          updatedAt: new Date("2023-01-02"),
        },
      ] as UserEntity[];

      // Act
      const domainUsers = UserMapper.toDomainList(userEntities);

      // Assert
      expect(domainUsers).toHaveLength(2);
      expect(domainUsers[0]).toBeInstanceOf(User);
      expect(domainUsers[1]).toBeInstanceOf(User);
      expect(domainUsers[0].id).toBe("user-1");
      expect(domainUsers[1].id).toBe("user-2");
      expect(domainUsers[1].phone).toBe("+1234567890");
      expect(domainUsers[1].role).toBe("admin");
    });

    it("应该处理空数组", () => {
      // Act
      const result = UserMapper.toDomainList([]);

      // Assert
      expect(result).toEqual([]);
    });

    it("应该处理null数组", () => {
      // Act
      const result = UserMapper.toDomainList(null as any);

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe("toEntityList", () => {
    it("应该将领域模型数组映射为实体数组", () => {
      // Arrange
      const domainUsers = [
        new User("user-1", "user1@example.com", "user1", "hash1", "User", "One"),
        new User("user-2", "user2@example.com", "user2", "hash2", "User", "Two"),
      ];
      domainUsers[1].phone = "+1234567890";
      domainUsers[1].role = "admin";

      // Act
      const userEntities = UserMapper.toEntityList(domainUsers);

      // Assert
      expect(userEntities).toHaveLength(2);
      expect(userEntities[0].id).toBe("user-1");
      expect(userEntities[1].id).toBe("user-2");
      expect(userEntities[1].phone).toBe("+1234567890");
      expect(userEntities[1].role).toBe("admin");
    });

    it("应该处理空数组", () => {
      // Act
      const result = UserMapper.toEntityList([]);

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe("toDTO", () => {
    it("应该将领域模型映射为DTO（不包含敏感信息）", () => {
      // Arrange
      const domainUser = new User(
        "user-123",
        "test@example.com",
        "testuser",
        "hashed_password",
        "Test",
        "User"
      );
      domainUser.phone = "+1234567890";
      domainUser.role = "admin";
      domainUser.lastLoginAt = new Date("2023-01-01");

      // Act
      const userDTO = UserMapper.toDTO(domainUser);

      // Assert
      expect(userDTO.id).toBe(domainUser.id);
      expect(userDTO.email).toBe(domainUser.email);
      expect(userDTO.username).toBe(domainUser.username);
      expect(userDTO.firstName).toBe(domainUser.firstName);
      expect(userDTO.lastName).toBe(domainUser.lastName);
      expect(userDTO.phone).toBe(domainUser.phone);
      expect(userDTO.isActive).toBe(domainUser.isActive);
      expect(userDTO.isEmailVerified).toBe(domainUser.isEmailVerified);
      expect(userDTO.role).toBe(domainUser.role);
      expect(userDTO.lastLoginAt).toEqual(domainUser.lastLoginAt);
      expect(userDTO.createdAt).toEqual(domainUser.createdAt);
      expect(userDTO.updatedAt).toEqual(domainUser.updatedAt);
      
      // 确保敏感信息不被包含
      expect(userDTO).not.toHaveProperty("passwordHash");
      expect(userDTO).not.toHaveProperty("password");
    });

    it("应该处理可选字段", () => {
      // Arrange
      const domainUser = new User(
        "user-123",
        "test@example.com",
        "testuser",
        "hashed_password",
        "Test",
        "User"
      );

      // Act
      const userDTO = UserMapper.toDTO(domainUser);

      // Assert
      expect(userDTO.phone).toBeNull();
      expect(userDTO.lastLoginAt).toBeNull();
    });
  });

  describe("toDTOList", () => {
    it("应该将领域模型数组映射为DTO数组", () => {
      // Arrange
      const domainUsers = [
        new User("user-1", "user1@example.com", "user1", "hash1", "User", "One"),
        new User("user-2", "user2@example.com", "user2", "hash2", "User", "Two"),
      ];

      // Act
      const userDTOs = UserMapper.toDTOList(domainUsers);

      // Assert
      expect(userDTOs).toHaveLength(2);
      expect(userDTOs[0].id).toBe("user-1");
      expect(userDTOs[1].id).toBe("user-2");
      expect(userDTOs[0]).not.toHaveProperty("passwordHash");
      expect(userDTOs[1]).not.toHaveProperty("passwordHash");
    });
  });

  describe("边界条件测试", () => {
    it("应该处理包含特殊字符的数据", () => {
      // Arrange
      const userEntity: UserEntity = {
        id: "user-123",
        email: "test+special@example.com",
        username: "test_user-123",
        passwordHash: "hash_with_special_chars!@#$%",
        firstName: "Test'Name",
        lastName: "User-Name",
        phone: "+1-234-567-8900",
        isActive: true,
        isEmailVerified: false,
        role: "user",
        lastLoginAt: null,
        createdAt: new Date("2023-01-01"),
        updatedAt: new Date("2023-01-02"),
      } as UserEntity;

      // Act
      const domainUser = UserMapper.toDomain(userEntity);
      const backToEntity = UserMapper.toEntity(domainUser);

      // Assert
      expect(domainUser.email).toBe(userEntity.email);
      expect(domainUser.username).toBe(userEntity.username);
      expect(domainUser.firstName).toBe(userEntity.firstName);
      expect(domainUser.lastName).toBe(userEntity.lastName);
      expect(domainUser.phone).toBe(userEntity.phone);
      expect(backToEntity.email).toBe(userEntity.email);
    });

    it("应该处理极长的字符串", () => {
      // Arrange
      const longString = "a".repeat(1000);
      const userEntity: UserEntity = {
        id: "user-123",
        email: "test@example.com",
        username: "testuser",
        passwordHash: longString,
        firstName: "Test",
        lastName: "User",
        phone: null,
        isActive: true,
        isEmailVerified: false,
        role: "user",
        lastLoginAt: null,
        createdAt: new Date("2023-01-01"),
        updatedAt: new Date("2023-01-02"),
      } as UserEntity;

      // Act
      const domainUser = UserMapper.toDomain(userEntity);

      // Assert
      expect(domainUser.passwordHash).toBe(longString);
      expect(domainUser.passwordHash.length).toBe(1000);
    });
  });
});