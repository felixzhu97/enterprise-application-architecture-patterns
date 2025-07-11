/**
 * 用户仓储实现
 * 演示 Repository 模式的具体实现
 *
 * 实现了领域层定义的 UserRepository 接口
 */

import { Repository } from "typeorm";
import { User } from "../../domain/model/user";
import {
  UserRepository,
  UserQueryOptions,
  PaginatedResult,
} from "../../domain/repositories/user.repository";
import { UserEntity } from "../../infrastructure/database/entities/user.entity";
import { UserEntityMapper } from "../mappers/user.mapper";
import { AppDataSource } from "../../infrastructure/database/data-source";
import { DataAccessObject } from "../../patterns/base/layer-supertype";

/**
 * TypeORM 用户仓储实现
 * 演示 Data Mapper 模式
 */
export class TypeORMUserRepository
  extends DataAccessObject
  implements UserRepository
{
  private repository: Repository<UserEntity>;
  private mapper: UserEntityMapper;

  constructor() {
    super();
    this.repository = AppDataSource.getRepository(UserEntity);
    this.mapper = new UserEntityMapper();
  }

  /**
   * 根据ID查找用户
   */
  async findById(id: string): Promise<User | null> {
    try {
      const entity = await this.repository.findOne({ where: { id } });
      return entity ? this.mapper.mapToLeft(entity) : null;
    } catch (error) {
      this.handleDatabaseError(error as Error, "findById");
    }
  }

  /**
   * 根据用户名查找用户
   */
  async findByUsername(username: string): Promise<User | null> {
    try {
      const entity = await this.repository.findOne({ where: { username } });
      return entity ? this.mapper.mapToLeft(entity) : null;
    } catch (error) {
      this.handleDatabaseError(error as Error, "findByUsername");
    }
  }

  /**
   * 根据邮箱查找用户
   */
  async findByEmail(email: string): Promise<User | null> {
    try {
      const entity = await this.repository.findOne({ where: { email } });
      return entity ? this.mapper.mapToLeft(entity) : null;
    } catch (error) {
      this.handleDatabaseError(error as Error, "findByEmail");
    }
  }

  /**
   * 查找所有用户
   */
  async findAll(): Promise<User[]> {
    try {
      const entities = await this.repository.find({
        order: { created_at: "DESC" },
      });
      return this.mapper.mapArrayToLeft(entities);
    } catch (error) {
      this.handleDatabaseError(error as Error, "findAll");
    }
  }

  /**
   * 查找活跃用户
   */
  async findActiveUsers(): Promise<User[]> {
    try {
      const entities = await this.repository.find({
        where: { status: "active" },
        order: { last_login_at: "DESC" },
      });
      return this.mapper.mapArrayToLeft(entities);
    } catch (error) {
      this.handleDatabaseError(error as Error, "findActiveUsers");
    }
  }

  /**
   * 根据条件查询用户
   */
  async findByConditions(options: UserQueryOptions): Promise<User[]> {
    try {
      const queryBuilder = this.repository.createQueryBuilder("user");

      // 应用查询条件
      if (options.status) {
        queryBuilder.andWhere("user.status = :status", {
          status: options.status,
        });
      }

      if (options.role) {
        queryBuilder.andWhere("user.role = :role", { role: options.role });
      }

      if (options.emailVerified !== undefined) {
        queryBuilder.andWhere("user.email_verified = :emailVerified", {
          emailVerified: options.emailVerified,
        });
      }

      if (options.createdAfter) {
        queryBuilder.andWhere("user.created_at >= :createdAfter", {
          createdAfter: options.createdAfter,
        });
      }

      if (options.createdBefore) {
        queryBuilder.andWhere("user.created_at <= :createdBefore", {
          createdBefore: options.createdBefore,
        });
      }

      // 应用排序
      if (options.sortBy) {
        const sortOrder = options.sortOrder || "DESC";
        queryBuilder.orderBy(`user.${options.sortBy}`, sortOrder);
      }

      // 应用分页
      if (options.limit) {
        queryBuilder.limit(options.limit);
      }

      if (options.offset) {
        queryBuilder.offset(options.offset);
      }

      const entities = await queryBuilder.getMany();
      return this.mapper.mapArrayToLeft(entities);
    } catch (error) {
      this.handleDatabaseError(error as Error, "findByConditions");
    }
  }

  /**
   * 分页查询用户
   */
  async findPaginated(
    page: number,
    pageSize: number,
    options?: UserQueryOptions
  ): Promise<PaginatedResult<User>> {
    try {
      const queryBuilder = this.repository.createQueryBuilder("user");

      // 应用查询条件（复用上面的逻辑）
      if (options) {
        if (options.status) {
          queryBuilder.andWhere("user.status = :status", {
            status: options.status,
          });
        }
        // ... 其他条件
      }

      // 计算偏移量
      const offset = (page - 1) * pageSize;
      queryBuilder.skip(offset).take(pageSize);

      // 执行查询
      const [entities, total] = await queryBuilder.getManyAndCount();
      const users = this.mapper.mapArrayToLeft(entities);

      return {
        items: users,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      };
    } catch (error) {
      this.handleDatabaseError(error as Error, "findPaginated");
    }
  }

  /**
   * 保存用户
   */
  async save(user: User): Promise<User> {
    try {
      await this.beginTransaction();

      const entity = this.mapper.mapToRight(user);
      const savedEntity = await this.repository.save(entity);

      await this.commitTransaction();

      return this.mapper.mapToLeft(savedEntity);
    } catch (error) {
      await this.rollbackTransaction();
      this.handleDatabaseError(error as Error, "save");
    }
  }

  /**
   * 批量保存用户
   */
  async saveMany(users: User[]): Promise<User[]> {
    try {
      await this.beginTransaction();

      const entities = this.mapper.mapArrayToRight(users);
      const savedEntities = await this.repository.save(entities);

      await this.commitTransaction();

      return this.mapper.mapArrayToLeft(savedEntities);
    } catch (error) {
      await this.rollbackTransaction();
      this.handleDatabaseError(error as Error, "saveMany");
    }
  }

  /**
   * 删除用户
   */
  async delete(id: string): Promise<void> {
    try {
      await this.beginTransaction();

      const result = await this.repository.delete(id);

      if (result.affected === 0) {
        throw new Error(`用户 ${id} 不存在`);
      }

      await this.commitTransaction();
    } catch (error) {
      await this.rollbackTransaction();
      this.handleDatabaseError(error as Error, "delete");
    }
  }

  /**
   * 检查用户是否存在
   */
  async exists(id: string): Promise<boolean> {
    try {
      const count = await this.repository.count({ where: { id } });
      return count > 0;
    } catch (error) {
      this.handleDatabaseError(error as Error, "exists");
    }
  }

  /**
   * 检查用户名是否存在
   */
  async existsByUsername(username: string): Promise<boolean> {
    try {
      const count = await this.repository.count({ where: { username } });
      return count > 0;
    } catch (error) {
      this.handleDatabaseError(error as Error, "existsByUsername");
    }
  }

  /**
   * 检查邮箱是否存在
   */
  async existsByEmail(email: string): Promise<boolean> {
    try {
      const count = await this.repository.count({ where: { email } });
      return count > 0;
    } catch (error) {
      this.handleDatabaseError(error as Error, "existsByEmail");
    }
  }

  /**
   * 统计用户数量
   */
  async count(options?: UserQueryOptions): Promise<number> {
    try {
      if (!options) {
        return await this.repository.count();
      }

      const queryBuilder = this.repository.createQueryBuilder("user");

      // 应用查询条件
      if (options.status) {
        queryBuilder.andWhere("user.status = :status", {
          status: options.status,
        });
      }
      // ... 其他条件

      return await queryBuilder.getCount();
    } catch (error) {
      this.handleDatabaseError(error as Error, "count");
    }
  }

  /**
   * 获取最近注册的用户
   */
  async findRecentUsers(limit: number): Promise<User[]> {
    try {
      const entities = await this.repository.find({
        order: { created_at: "DESC" },
        take: limit,
      });
      return this.mapper.mapArrayToLeft(entities);
    } catch (error) {
      this.handleDatabaseError(error as Error, "findRecentUsers");
    }
  }

  /**
   * 查找需要发送邮件验证提醒的用户
   */
  async findUnverifiedUsers(daysSinceRegistration: number): Promise<User[]> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysSinceRegistration);

      const entities = await this.repository.find({
        where: {
          email_verified: false,
          created_at: cutoffDate,
        },
      });

      return this.mapper.mapArrayToLeft(entities);
    } catch (error) {
      this.handleDatabaseError(error as Error, "findUnverifiedUsers");
    }
  }

  /**
   * 查找长时间未登录的用户
   */
  async findInactiveUsers(daysSinceLastLogin: number): Promise<User[]> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysSinceLastLogin);

      const queryBuilder = this.repository.createQueryBuilder("user");
      queryBuilder.where(
        "user.last_login_at < :cutoffDate OR user.last_login_at IS NULL",
        {
          cutoffDate,
        }
      );

      const entities = await queryBuilder.getMany();
      return this.mapper.mapArrayToLeft(entities);
    } catch (error) {
      this.handleDatabaseError(error as Error, "findInactiveUsers");
    }
  }

  /**
   * 更新用户最后登录时间
   */
  async updateLastLogin(userId: string, loginTime: Date): Promise<void> {
    try {
      await this.repository.update(userId, {
        last_login_at: loginTime,
      });
    } catch (error) {
      this.handleDatabaseError(error as Error, "updateLastLogin");
    }
  }

  /**
   * 批量更新用户状态
   */
  async updateUserStatus(userIds: string[], status: string): Promise<void> {
    try {
      await this.beginTransaction();

      await this.repository
        .createQueryBuilder()
        .update(UserEntity)
        .set({ status })
        .where("id IN (:...userIds)", { userIds })
        .execute();

      await this.commitTransaction();
    } catch (error) {
      await this.rollbackTransaction();
      this.handleDatabaseError(error as Error, "updateUserStatus");
    }
  }

  /**
   * 搜索用户
   */
  async search(keyword: string, limit: number = 20): Promise<User[]> {
    try {
      const queryBuilder = this.repository.createQueryBuilder("user");

      queryBuilder.where(
        "user.username ILIKE :keyword OR user.email ILIKE :keyword OR " +
          "user.first_name ILIKE :keyword OR user.last_name ILIKE :keyword",
        { keyword: `%${keyword}%` }
      );

      queryBuilder.limit(limit);

      const entities = await queryBuilder.getMany();
      return this.mapper.mapArrayToLeft(entities);
    } catch (error) {
      this.handleDatabaseError(error as Error, "search");
    }
  }
}
