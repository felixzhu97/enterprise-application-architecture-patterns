/**
 * 测试固件和工具函数
 * 
 * 提供可重用的测试设置和断言工具
 */

import { vi, MockedFunction } from 'vitest';
import { Repository } from 'typeorm';
import { UserEntity } from '../../infrastructure/database/entities/user.entity';
import { User } from '../../domain/model/user';
import { UserTestBuilder } from '../helpers/user-test-builder';

/**
 * Mock Repository 类型定义
 */
export type MockedRepository<T> = {
  [K in keyof Repository<T>]: MockedFunction<Repository<T>[K]>;
};

/**
 * 创建 Mock Repository
 */
export function createMockRepository<T>(): MockedRepository<T> {
  return {
    findOne: vi.fn(),
    find: vi.fn(),
    save: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
    create: vi.fn(),
    createQueryBuilder: vi.fn(),
    findOneBy: vi.fn(),
    findBy: vi.fn(),
    remove: vi.fn(),
    insert: vi.fn(),
    clear: vi.fn(),
    increment: vi.fn(),
    decrement: vi.fn(),
    sum: vi.fn(),
    average: vi.fn(),
    minimum: vi.fn(),
    maximum: vi.fn(),
    query: vi.fn(),
    findAndCount: vi.fn(),
    findAndCountBy: vi.fn(),
    findOneOrFail: vi.fn(),
    findOneByOrFail: vi.fn(),
    countBy: vi.fn(),
    exist: vi.fn(),
    existsBy: vi.fn(),
    softDelete: vi.fn(),
    softRemove: vi.fn(),
    recover: vi.fn(),
    restore: vi.fn(),
    upsert: vi.fn(),
    preload: vi.fn(),
    merge: vi.fn(),
    getId: vi.fn(),
    hasId: vi.fn(),
    reload: vi.fn(),
    extend: vi.fn(),
    target: {} as any,
    manager: {} as any,
    metadata: {} as any,
    queryRunner: {} as any,
  } as MockedRepository<T>;
}

/**
 * 用户实体转换工具
 */
export class UserEntityConverter {
  static fromDomain(user: User): UserEntity {
    const entity = new UserEntity();
    entity.id = user.getId();
    entity.username = user.username;
    entity.email = user.email;
    entity.password_hash = user.passwordHash;
    entity.first_name = user.profile.firstName;
    entity.last_name = user.profile.lastName;
    entity.phone = user.profile.phone || null;
    entity.avatar = user.profile.avatar || null;
    entity.date_of_birth = user.profile.dateOfBirth || null;
    entity.status = user.status;
    entity.role = user.role;
    entity.email_verified = user.emailVerified;
    entity.last_login_at = user.lastLoginAt || null;
    entity.failed_login_attempts = user.failedLoginAttempts;
    entity.locked_until = user.lockedUntil || null;
    entity.version = user.getVersion();
    entity.created_at = user.getCreatedAt();
    entity.updated_at = user.getUpdatedAt();
    return entity;
  }

  static createList(count: number): UserEntity[] {
    const entities: UserEntity[] = [];
    for (let i = 1; i <= count; i++) {
      const user = UserTestBuilder.create()
        .withId(`user-${i}`)
        .withUsername(`user${i}`)
        .withEmail(`user${i}@example.com`)
        .withName(`User${i}`, `Test${i}`)
        .build();
      
      entities.push(this.fromDomain(user));
    }
    return entities;
  }
}

/**
 * 测试断言工具
 */
export class TestAssertions {
  static expectUserToMatch(actual: User | null, expected: Partial<User>) {
    expect(actual).toBeTruthy();
    if (actual) {
      if (expected.username) expect(actual.username).toBe(expected.username);
      if (expected.email) expect(actual.email).toBe(expected.email);
      // 添加更多断言...
    }
  }

  static expectRepositoryMethodCalled(
    mockRepo: MockedRepository<any>,
    method: keyof Repository<any>,
    times: number = 1
  ) {
    expect(mockRepo[method]).toHaveBeenCalledTimes(times);
  }
}

/**
 * 测试数据生成器
 */
export class TestDataGenerator {
  static generateUniqueEmail(): string {
    return `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}@example.com`;
  }

  static generateUniqueUsername(): string {
    return `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  static generateRandomString(length: number = 10): string {
    return Math.random().toString(36).substr(2, length);
  }

  static generatePastDate(daysAgo: number = 30): Date {
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    return date;
  }

  static generateFutureDate(daysFromNow: number = 30): Date {
    const date = new Date();
    date.setDate(date.getDate() + daysFromNow);
    return date;
  }
}

/**
 * 数据库测试工具
 */
export class DatabaseTestUtils {
  static mockSuccessfulSave<T>(entity: T): void {
    // 模拟成功保存的行为
  }

  static mockDatabaseError(errorMessage: string = "Database error"): Error {
    return new Error(errorMessage);
  }

  static mockQueryResult<T>(data: T[]): { items: T[]; total: number } {
    return {
      items: data,
      total: data.length,
    };
  }
}

/**
 * 性能测试工具
 */
export class PerformanceTestUtils {
  static async measureExecutionTime<T>(
    operation: () => Promise<T>
  ): Promise<{ result: T; executionTime: number }> {
    const startTime = performance.now();
    const result = await operation();
    const endTime = performance.now();
    
    return {
      result,
      executionTime: endTime - startTime,
    };
  }

  static expectExecutionTimeUnder(actualTime: number, maxTime: number): void {
    expect(actualTime).toBeLessThan(maxTime);
  }
}