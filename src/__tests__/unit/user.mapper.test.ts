/**
 * 用户映射器单元测试
 *
 * 测试领域模型与数据实体之间的映射逻辑
 */

import { describe, it, expect, beforeEach } from "vitest";
import { UserEntityMapper } from "../../data/mappers/user.mapper";
import { User, UserProfile } from "../../domain/model/user";
import { UserEntity } from "../../infrastructure/database/entities/user.entity";

describe("UserEntityMapper", () => {
  let mapper: UserEntityMapper;

  beforeEach(() => {
    mapper = new UserEntityMapper();
  });

  describe("mapToRight", () => {
    it("应该将领域模型映射为数据实体", () => {
      // Arrange
      const profile = new UserProfile("Test", "User", "13800138000");
      const domainUser = new User(
        "testuser",
        "test@example.com",
        "password123",
        profile
      );

      // Act
      const entity = mapper.mapToRight(domainUser);

      // Assert
      expect(entity).toBeInstanceOf(UserEntity);
      expect(entity.id).toBe(domainUser.getId());
      expect(entity.username).toBe(domainUser.username);
      expect(entity.email).toBe(domainUser.email);
      expect(entity.password_hash).toBe(domainUser.passwordHash);
      expect(entity.first_name).toBe(domainUser.profile.firstName);
      expect(entity.last_name).toBe(domainUser.profile.lastName);
      expect(entity.phone).toBe(domainUser.profile.phone);
      expect(entity.status).toBe(domainUser.status);
      expect(entity.role).toBe(domainUser.role);
      expect(entity.email_verified).toBe(domainUser.emailVerified);
    });

    it("应该处理可选字段为null的情况", () => {
      // Arrange
      const profile = new UserProfile("Test", "User");
      const domainUser = new User(
        "testuser",
        "test@example.com",
        "password123",
        profile
      );

      // Act
      const entity = mapper.mapToRight(domainUser);

      // Assert
      expect(entity.phone).toBeNull();
      expect(entity.avatar).toBeNull();
      expect(entity.date_of_birth).toBeNull();
      expect(entity.last_login_at).toBeNull();
      expect(entity.locked_until).toBeNull();
    });
  });

  describe("mapToLeft", () => {
    it("应该将数据实体映射为领域模型", () => {
      // Arrange
      const entity = new UserEntity();
      entity.id = "user-123";
      entity.username = "testuser";
      entity.email = "test@example.com";
      entity.password_hash = "hashed_password_123456";
      entity.first_name = "Test";
      entity.last_name = "User";
      entity.phone = "13800138000";
      entity.status = "active";
      entity.role = "customer";
      entity.email_verified = false;
      entity.last_login_at = new Date("2023-01-01");
      entity.failed_login_attempts = 0;
      entity.version = 1;
      entity.created_at = new Date("2023-01-01");
      entity.updated_at = new Date("2023-01-02");

      // Act
      const domainUser = mapper.mapToLeft(entity);

      // Assert
      expect(domainUser).toBeInstanceOf(User);
      expect(domainUser.getId()).toBe(entity.id);
      expect(domainUser.username).toBe(entity.username);
      expect(domainUser.email).toBe(entity.email);
      expect(domainUser.passwordHash).toBe(entity.password_hash);
      expect(domainUser.profile.firstName).toBe(entity.first_name);
      expect(domainUser.profile.lastName).toBe(entity.last_name);
      expect(domainUser.profile.phone).toBe(entity.phone);
      expect(domainUser.status).toBe(entity.status);
      expect(domainUser.role).toBe(entity.role);
      expect(domainUser.emailVerified).toBe(entity.email_verified);
      expect(domainUser.lastLoginAt).toEqual(entity.last_login_at);
    });

    it("应该处理可选字段为null的情况", () => {
      // Arrange
      const entity = new UserEntity();
      entity.id = "user-123";
      entity.username = "testuser";
      entity.email = "test@example.com";
      entity.password_hash = "hashed_password_123456";
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
      entity.created_at = new Date("2023-01-01");
      entity.updated_at = new Date("2023-01-02");

      // Act
      const domainUser = mapper.mapToLeft(entity);

      // Assert
      expect(domainUser.profile.phone).toBeUndefined();
      expect(domainUser.profile.avatar).toBeUndefined();
      expect(domainUser.profile.dateOfBirth).toBeUndefined();
      expect(domainUser.lastLoginAt).toBeUndefined();
      expect(domainUser.lockedUntil).toBeUndefined();
    });
  });

  describe("双向映射一致性", () => {
    it("应该保持双向映射的一致性", () => {
      // Arrange
      const profile = new UserProfile("Test", "User", "13800138000");
      const originalUser = new User(
        "testuser",
        "test@example.com",
        "password123",
        profile
      );

      // Act
      const entity = mapper.mapToRight(originalUser);
      const mappedUser = mapper.mapToLeft(entity);

      // Assert
      expect(mappedUser.getId()).toBe(originalUser.getId());
      expect(mappedUser.username).toBe(originalUser.username);
      expect(mappedUser.email).toBe(originalUser.email);
      expect(mappedUser.profile.firstName).toBe(originalUser.profile.firstName);
      expect(mappedUser.profile.lastName).toBe(originalUser.profile.lastName);
      expect(mappedUser.profile.phone).toBe(originalUser.profile.phone);
      expect(mappedUser.status).toBe(originalUser.status);
      expect(mappedUser.role).toBe(originalUser.role);
      expect(mappedUser.emailVerified).toBe(originalUser.emailVerified);
    });
  });
});
