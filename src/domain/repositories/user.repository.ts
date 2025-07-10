/**
 * 用户仓储接口
 * 演示 Repository 模式和 Separated Interface 模式
 *
 * 接口定义在领域层，实现在基础设施层
 */

import { User } from "../model/user";

/**
 * 用户查询条件
 */
export interface UserQueryOptions {
  status?: string;
  role?: string;
  emailVerified?: boolean;
  createdAfter?: Date;
  createdBefore?: Date;
  limit?: number;
  offset?: number;
  sortBy?: "createdAt" | "updatedAt" | "username" | "email";
  sortOrder?: "ASC" | "DESC";
}

/**
 * 分页结果
 */
export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * 用户仓储接口
 * 定义了用户数据访问的所有方法
 */
export interface UserRepository {
  /**
   * 根据ID查找用户
   */
  findById(id: string): Promise<User | null>;

  /**
   * 根据用户名查找用户
   */
  findByUsername(username: string): Promise<User | null>;

  /**
   * 根据邮箱查找用户
   */
  findByEmail(email: string): Promise<User | null>;

  /**
   * 查找所有用户
   */
  findAll(): Promise<User[]>;

  /**
   * 查找活跃用户
   */
  findActiveUsers(): Promise<User[]>;

  /**
   * 根据条件查询用户
   */
  findByConditions(options: UserQueryOptions): Promise<User[]>;

  /**
   * 分页查询用户
   */
  findPaginated(
    page: number,
    pageSize: number,
    options?: UserQueryOptions
  ): Promise<PaginatedResult<User>>;

  /**
   * 保存用户
   */
  save(user: User): Promise<User>;

  /**
   * 批量保存用户
   */
  saveMany(users: User[]): Promise<User[]>;

  /**
   * 删除用户
   */
  delete(id: string): Promise<void>;

  /**
   * 检查用户是否存在
   */
  exists(id: string): Promise<boolean>;

  /**
   * 检查用户名是否存在
   */
  existsByUsername(username: string): Promise<boolean>;

  /**
   * 检查邮箱是否存在
   */
  existsByEmail(email: string): Promise<boolean>;

  /**
   * 统计用户数量
   */
  count(options?: UserQueryOptions): Promise<number>;

  /**
   * 获取最近注册的用户
   */
  findRecentUsers(limit: number): Promise<User[]>;

  /**
   * 查找需要发送邮件验证提醒的用户
   */
  findUnverifiedUsers(daysSinceRegistration: number): Promise<User[]>;

  /**
   * 查找长时间未登录的用户
   */
  findInactiveUsers(daysSinceLastLogin: number): Promise<User[]>;

  /**
   * 更新用户最后登录时间
   */
  updateLastLogin(userId: string, loginTime: Date): Promise<void>;

  /**
   * 批量更新用户状态
   */
  updateUserStatus(userIds: string[], status: string): Promise<void>;

  /**
   * 搜索用户
   */
  search(keyword: string, limit?: number): Promise<User[]>;
}
