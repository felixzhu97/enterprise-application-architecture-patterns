/**
 * 用户数据映射器
 * 演示 Data Mapper 模式的具体实现
 *
 * 负责在领域对象和数据库实体之间进行转换
 */

import {
  User,
  UserProfile,
  UserStatus,
  UserRole,
  Address,
} from "../../domain/model/user";
import { UserEntity } from "../../infrastructure/database/entities/user.entity";
import { BidirectionalMapper } from "../../patterns/base/mapper";

/**
 * 用户实体映射器
 * 在 User 领域对象和 UserEntity 数据库实体之间进行转换
 */
export class UserEntityMapper extends BidirectionalMapper<User, UserEntity> {
  /**
   * 将领域对象映射为数据库实体
   */
  mapToRight(user: User): UserEntity {
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

  /**
   * 将数据库实体映射为领域对象
   */
  mapToLeft(entity: UserEntity): User {
    // 创建用户资料值对象
    const profile = new UserProfile(
      entity.first_name,
      entity.last_name,
      entity.phone || undefined,
      entity.avatar || undefined,
      entity.date_of_birth || undefined
    );

    // 创建用户领域对象
    const user = new User(
      entity.username,
      entity.email,
      "", // 密码在映射时不传递原文
      profile,
      entity.role as UserRole,
      entity.id
    );

    // 设置私有属性（通过反射或友元访问）
    // 这里使用类型断言来访问私有属性（仅用于演示）
    (user as any)._passwordHash = entity.password_hash;
    (user as any)._status = entity.status as UserStatus;
    (user as any)._emailVerified = entity.email_verified;
    (user as any)._lastLoginAt = entity.last_login_at || undefined;
    (user as any)._failedLoginAttempts = entity.failed_login_attempts;
    (user as any)._lockedUntil = entity.locked_until || undefined;
    (user as any).version = entity.version;
    (user as any).createdAt = entity.created_at;
    (user as any).updatedAt = entity.updated_at;

    return user;
  }
}

/**
 * 用户查询结果映射器
 * 用于处理特殊的查询结果映射
 */
export class UserQueryResultMapper {
  private userMapper: UserEntityMapper;

  constructor() {
    this.userMapper = new UserEntityMapper();
  }

  /**
   * 映射用户统计查询结果
   */
  mapUserStatistics(rawResult: any): {
    totalUsers: number;
    activeUsers: number;
    inactiveUsers: number;
    suspendedUsers: number;
  } {
    return {
      totalUsers: parseInt(rawResult.total_users, 10) || 0,
      activeUsers: parseInt(rawResult.active_users, 10) || 0,
      inactiveUsers: parseInt(rawResult.inactive_users, 10) || 0,
      suspendedUsers: parseInt(rawResult.suspended_users, 10) || 0,
    };
  }

  /**
   * 映射用户活动统计
   */
  mapUserActivity(rawResult: any): {
    userId: string;
    username: string;
    lastLoginAt: Date | null;
    loginCount: number;
  } {
    return {
      userId: rawResult.user_id,
      username: rawResult.username,
      lastLoginAt: rawResult.last_login_at
        ? new Date(rawResult.last_login_at)
        : null,
      loginCount: parseInt(rawResult.login_count, 10) || 0,
    };
  }

  /**
   * 映射用户搜索结果
   */
  mapSearchResult(entity: UserEntity): {
    id: string;
    username: string;
    email: string;
    fullName: string;
    avatar: string | null;
    status: string;
  } {
    return {
      id: entity.id,
      username: entity.username,
      email: entity.email,
      fullName: `${entity.first_name} ${entity.last_name}`,
      avatar: entity.avatar,
      status: entity.status,
    };
  }
}

/**
 * 用户地址映射器
 * 处理用户地址相关的映射（如果有专门的地址表）
 */
export class UserAddressMapper {
  /**
   * 将地址值对象映射为数据库记录
   */
  mapAddressToRecord(address: Address, userId: string): any {
    return {
      user_id: userId,
      street: address.street,
      city: address.city,
      province: address.province,
      postal_code: address.postalCode,
      country: address.country,
      created_at: new Date(),
      updated_at: new Date(),
    };
  }

  /**
   * 将数据库记录映射为地址值对象
   */
  mapRecordToAddress(record: any): Address {
    return new Address(
      record.street,
      record.city,
      record.province,
      record.postal_code,
      record.country
    );
  }
}

/**
 * 映射器工厂
 * 提供所有用户相关映射器的实例
 */
export class UserMapperFactory {
  private static userEntityMapper: UserEntityMapper;
  private static queryResultMapper: UserQueryResultMapper;
  private static addressMapper: UserAddressMapper;

  static getUserEntityMapper(): UserEntityMapper {
    if (!this.userEntityMapper) {
      this.userEntityMapper = new UserEntityMapper();
    }
    return this.userEntityMapper;
  }

  static getQueryResultMapper(): UserQueryResultMapper {
    if (!this.queryResultMapper) {
      this.queryResultMapper = new UserQueryResultMapper();
    }
    return this.queryResultMapper;
  }

  static getAddressMapper(): UserAddressMapper {
    if (!this.addressMapper) {
      this.addressMapper = new UserAddressMapper();
    }
    return this.addressMapper;
  }
}
