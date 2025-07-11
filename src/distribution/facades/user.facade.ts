/**
 * 用户远程门面
 * 演示 Remote Facade 模式
 *
 * 为分布式系统提供粗粒度的远程接口
 */

import {
  UserDTO,
  UserListItemDTO,
  UserRegistrationDTO,
  UserLoginDTO,
  UserLoginResponseDTO,
  UserProfileUpdateDTO,
  UserStatisticsDTO,
  PaginatedUserListDTO,
} from "../dto/user.dto";

/**
 * 用户查询选项
 */
export interface UserQueryOptions {
  status?: string;
  role?: string;
  emailVerified?: boolean;
  search?: string;
  sortBy?: string;
  sortOrder?: "ASC" | "DESC";
}

/**
 * 用户远程门面接口
 * 定义了所有用户相关的远程操作
 */
export interface UserFacade {
  /**
   * 用户注册
   */
  registerUser(registrationData: UserRegistrationDTO): Promise<UserDTO>;

  /**
   * 用户登录
   */
  authenticateUser(loginData: UserLoginDTO): Promise<UserLoginResponseDTO>;

  /**
   * 获取用户信息
   */
  getUserById(userId: string): Promise<UserDTO | null>;

  /**
   * 更新用户资料
   */
  updateUserProfile(
    userId: string,
    updateData: UserProfileUpdateDTO
  ): Promise<UserDTO>;

  /**
   * 获取用户列表（分页）
   */
  getUserList(
    page: number,
    pageSize: number,
    options?: UserQueryOptions
  ): Promise<PaginatedUserListDTO>;

  /**
   * 搜索用户
   */
  searchUsers(keyword: string, limit?: number): Promise<UserListItemDTO[]>;

  /**
   * 获取用户统计信息
   */
  getUserStatistics(): Promise<UserStatisticsDTO>;

  /**
   * 验证用户邮箱
   */
  verifyUserEmail(userId: string, token: string): Promise<boolean>;

  /**
   * 重置用户密码
   */
  resetUserPassword(email: string): Promise<void>;

  /**
   * 批量更新用户状态
   */
  updateUsersStatus(userIds: string[], status: string): Promise<void>;
}

/**
 * 用户远程门面实现
 * 聚合了多个细粒度服务调用为粗粒度操作
 */
export class UserRemoteFacade implements UserFacade {
  constructor(
    // 注入相关服务
    private userService: any, // UserDomainService
    private userRepository: any, // UserRepository
    private emailService: any // EmailService
  ) {}

  /**
   * 用户注册
   * 聚合了验证、创建、发送邮件等操作
   */
  async registerUser(registrationData: UserRegistrationDTO): Promise<UserDTO> {
    try {
      // 验证输入数据
      const validationErrors = registrationData.validate();
      if (validationErrors.length > 0) {
        throw new Error(`注册数据验证失败: ${validationErrors.join(", ")}`);
      }

      // 调用领域服务注册用户
      const user = await this.userService.registerUser({
        username: registrationData.username,
        email: registrationData.email,
        password: registrationData.password,
        firstName: registrationData.firstName,
        lastName: registrationData.lastName,
        phone: registrationData.phone,
      });

      // 转换为DTO返回
      return this.convertUserToDTO(user);
    } catch (error) {
      throw new Error(`用户注册失败: ${(error as Error).message}`);
    }
  }

  /**
   * 用户登录
   */
  async authenticateUser(
    loginData: UserLoginDTO
  ): Promise<UserLoginResponseDTO> {
    try {
      const result = await this.userService.authenticateUser(
        loginData.username,
        loginData.password
      );

      if (!result.success) {
        return new UserLoginResponseDTO(
          false,
          undefined,
          undefined,
          result.message,
          result.requiresEmailVerification
        );
      }

      const userDTO = this.convertUserToDTO(result.user);

      // 生成访问令牌（简化实现）
      const token = this.generateAccessToken(result.user);

      return new UserLoginResponseDTO(true, userDTO, token, "登录成功");
    } catch (error) {
      return new UserLoginResponseDTO(
        false,
        undefined,
        undefined,
        `登录失败: ${(error as Error).message}`
      );
    }
  }

  /**
   * 获取用户信息
   */
  async getUserById(userId: string): Promise<UserDTO | null> {
    try {
      const user = await this.userRepository.findById(userId);
      return user ? this.convertUserToDTO(user) : null;
    } catch (error) {
      throw new Error(`获取用户信息失败: ${(error as Error).message}`);
    }
  }

  /**
   * 更新用户资料
   */
  async updateUserProfile(
    userId: string,
    updateData: UserProfileUpdateDTO
  ): Promise<UserDTO> {
    try {
      const user = await this.userRepository.findById(userId);
      if (!user) {
        throw new Error("用户不存在");
      }

      // 更新用户资料
      user.updateProfile({
        firstName: updateData.firstName,
        lastName: updateData.lastName,
        phone: updateData.phone,
        avatar: updateData.avatar,
        dateOfBirth: updateData.dateOfBirth,
      });

      const updatedUser = await this.userRepository.save(user);
      return this.convertUserToDTO(updatedUser);
    } catch (error) {
      throw new Error(`更新用户资料失败: ${(error as Error).message}`);
    }
  }

  /**
   * 获取用户列表（分页）
   */
  async getUserList(
    page: number,
    pageSize: number,
    options?: UserQueryOptions
  ): Promise<PaginatedUserListDTO> {
    try {
      const result = await this.userRepository.findPaginated(page, pageSize, {
        status: options?.status,
        role: options?.role,
        emailVerified: options?.emailVerified,
        sortBy: options?.sortBy,
        sortOrder: options?.sortOrder,
      });

      const userListItems = result.items.map(
        (user: any) =>
          new UserListItemDTO(
            user.getId(),
            user.username,
            user.email,
            `${user.profile.firstName} ${user.profile.lastName}`,
            user.status,
            user.role,
            user.emailVerified,
            user.lastLoginAt,
            user.getCreatedAt()
          )
      );

      return new PaginatedUserListDTO(
        userListItems,
        result.total,
        result.page,
        result.pageSize,
        result.totalPages
      );
    } catch (error) {
      throw new Error(`获取用户列表失败: ${(error as Error).message}`);
    }
  }

  /**
   * 搜索用户
   */
  async searchUsers(
    keyword: string,
    limit: number = 20
  ): Promise<UserListItemDTO[]> {
    try {
      if (!keyword || keyword.trim().length < 2) {
        throw new Error("搜索关键词至少需要2个字符");
      }

      const users = await this.userRepository.search(keyword.trim(), limit);

      return users.map(
        (user: any) =>
          new UserListItemDTO(
            user.getId(),
            user.username,
            user.email,
            `${user.profile.firstName} ${user.profile.lastName}`,
            user.status,
            user.role,
            user.emailVerified,
            user.lastLoginAt,
            user.getCreatedAt()
          )
      );
    } catch (error) {
      throw new Error(`搜索用户失败: ${(error as Error).message}`);
    }
  }

  /**
   * 获取用户统计信息
   */
  async getUserStatistics(): Promise<UserStatisticsDTO> {
    try {
      const statistics = await this.userService.getUserStatistics();

      return new UserStatisticsDTO(
        statistics.totalUsers,
        statistics.activeUsers,
        statistics.newUsersThisMonth,
        statistics.suspendedUsers
      );
    } catch (error) {
      throw new Error(`获取用户统计失败: ${(error as Error).message}`);
    }
  }

  /**
   * 验证用户邮箱
   */
  async verifyUserEmail(userId: string, token: string): Promise<boolean> {
    try {
      return await this.userService.verifyEmail(userId, token);
    } catch (error) {
      throw new Error(`邮箱验证失败: ${(error as Error).message}`);
    }
  }

  /**
   * 重置用户密码
   */
  async resetUserPassword(email: string): Promise<void> {
    try {
      await this.userService.resetPassword(email);
    } catch (error) {
      throw new Error(`密码重置失败: ${(error as Error).message}`);
    }
  }

  /**
   * 批量更新用户状态
   */
  async updateUsersStatus(userIds: string[], status: string): Promise<void> {
    try {
      if (!userIds || userIds.length === 0) {
        throw new Error("用户ID列表不能为空");
      }

      const validStatuses = ["active", "inactive", "suspended", "deleted"];
      if (!validStatuses.includes(status)) {
        throw new Error("无效的用户状态");
      }

      await this.userRepository.updateUserStatus(userIds, status);
    } catch (error) {
      throw new Error(`批量更新用户状态失败: ${(error as Error).message}`);
    }
  }

  /**
   * 将领域对象转换为DTO
   */
  private convertUserToDTO(user: any): UserDTO {
    return new UserDTO(
      user.getId(),
      user.username,
      user.email,
      user.profile.firstName,
      user.profile.lastName,
      user.profile.phone,
      user.profile.avatar,
      user.status,
      user.role,
      user.emailVerified,
      user.getCreatedAt(),
      user.getUpdatedAt()
    );
  }

  /**
   * 生成访问令牌
   */
  private generateAccessToken(user: any): string {
    // 这里应该使用JWT或其他安全令牌机制
    // 简化实现
    const payload = {
      userId: user.getId(),
      username: user.username,
      role: user.role,
      timestamp: Date.now(),
    };

    return Buffer.from(JSON.stringify(payload)).toString("base64");
  }
}
