/**
 * 用户领域服务
 * 演示 Domain Service 模式
 *
 * 当业务逻辑不属于特定实体时，使用领域服务来封装
 */

import { User, UserProfile, Address } from "../model/user";
import { UserRepository } from "../repositories/user.repository";
import { EmailService } from "../../patterns/base/separated-interface";
import { ServiceObject } from "../../patterns/base/layer-supertype";

/**
 * 用户注册数据
 */
export interface UserRegistrationData {
  username: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
}

/**
 * 用户认证结果
 */
export interface AuthenticationResult {
  success: boolean;
  user?: User;
  message?: string;
  requiresEmailVerification?: boolean;
}

/**
 * 用户统计信息
 */
export interface UserStatistics {
  totalUsers: number;
  activeUsers: number;
  newUsersThisMonth: number;
  suspendedUsers: number;
}

/**
 * 用户领域服务
 * 处理跨实体的用户相关业务逻辑
 */
export class UserDomainService extends ServiceObject {
  constructor(
    private userRepository: UserRepository,
    private emailService: EmailService
  ) {
    super();
  }

  /**
   * 用户注册业务逻辑
   * 这是一个复杂的业务流程，涉及多个步骤
   */
  async registerUser(registrationData: UserRegistrationData): Promise<User> {
    return this.executeService("registerUser", async () => {
      // 1. 检查用户名和邮箱是否已存在
      await this.validateUniqueUserData(
        registrationData.username,
        registrationData.email
      );

      // 2. 创建用户资料
      const profile = new UserProfile(
        registrationData.firstName,
        registrationData.lastName,
        registrationData.phone
      );

      // 3. 创建用户实体
      const user = new User(
        registrationData.username,
        registrationData.email,
        registrationData.password,
        profile
      );

      // 4. 应用业务规则
      this.validateBusinessRules([
        () => this.isValidPassword(registrationData.password),
        () => this.isValidUsername(registrationData.username),
        () => this.isValidEmail(registrationData.email),
      ]);

      // 5. 保存用户
      const savedUser = await this.userRepository.save(user);

      // 6. 发送欢迎邮件
      await this.sendWelcomeEmail(savedUser);

      return savedUser;
    });
  }

  /**
   * 用户认证业务逻辑
   */
  async authenticateUser(
    username: string,
    password: string
  ): Promise<AuthenticationResult> {
    return this.executeService("authenticateUser", async () => {
      // 1. 根据用户名或邮箱查找用户
      const user = await this.findUserByUsernameOrEmail(username);

      if (!user) {
        return {
          success: false,
          message: "用户名或密码错误",
        };
      }

      // 2. 检查账户状态
      if (!user.isActive()) {
        if (user.isLocked()) {
          return {
            success: false,
            message: "账户已被锁定，请稍后重试",
          };
        }

        return {
          success: false,
          message: "账户已被禁用",
        };
      }

      // 3. 验证密码
      if (!user.verifyPassword(password)) {
        user.recordFailedLogin();
        await this.userRepository.save(user);

        return {
          success: false,
          message: "用户名或密码错误",
        };
      }

      // 4. 检查邮箱验证状态
      if (!user.emailVerified) {
        return {
          success: false,
          message: "请先验证您的邮箱",
          requiresEmailVerification: true,
        };
      }

      // 5. 记录成功登录
      user.recordSuccessfulLogin();
      await this.userRepository.save(user);

      return {
        success: true,
        user: user,
      };
    });
  }

  /**
   * 重置用户密码
   */
  async resetPassword(email: string): Promise<void> {
    return this.executeService("resetPassword", async () => {
      const user = await this.userRepository.findByEmail(email);

      if (!user) {
        // 为了安全，即使用户不存在也不暴露信息
        return;
      }

      // 生成重置令牌（这里简化处理）
      const resetToken = this.generateResetToken();

      // 发送重置邮件
      await this.emailService.sendPasswordReset(email, resetToken);
    });
  }

  /**
   * 验证邮箱
   */
  async verifyEmail(userId: string, token: string): Promise<boolean> {
    return this.executeService("verifyEmail", async () => {
      const user = await this.userRepository.findById(userId);

      if (!user) {
        return false;
      }

      // 验证令牌（这里简化处理）
      if (!this.validateEmailToken(token)) {
        return false;
      }

      user.verifyEmail();
      await this.userRepository.save(user);

      return true;
    });
  }

  /**
   * 获取用户统计信息
   */
  async getUserStatistics(): Promise<UserStatistics> {
    return this.executeService("getUserStatistics", async () => {
      const activeUsers = await this.userRepository.findActiveUsers();
      const allUsers = await this.userRepository.findAll();

      // 计算本月新用户（简化实现）
      const thisMonth = new Date();
      thisMonth.setDate(1);
      const newUsersThisMonth = allUsers.filter(
        (user) => user.getCreatedAt() >= thisMonth
      ).length;

      const suspendedUsers = allUsers.filter(
        (user) => user.status === "suspended"
      ).length;

      return {
        totalUsers: allUsers.length,
        activeUsers: activeUsers.length,
        newUsersThisMonth,
        suspendedUsers,
      };
    });
  }

  /**
   * 批量导入用户
   */
  async importUsers(userData: UserRegistrationData[]): Promise<User[]> {
    return this.executeService("importUsers", async () => {
      const importedUsers: User[] = [];

      for (const data of userData) {
        try {
          const user = await this.registerUser(data);
          importedUsers.push(user);
        } catch (error) {
          // 记录错误但继续处理其他用户
          console.error(`导入用户失败: ${data.username}`, error);
        }
      }

      return importedUsers;
    });
  }

  /**
   * 检查用户数据唯一性
   */
  private async validateUniqueUserData(
    username: string,
    email: string
  ): Promise<void> {
    const existingUserByUsername = await this.userRepository.findByUsername(
      username
    );
    if (existingUserByUsername) {
      throw new Error("用户名已存在");
    }

    const existingUserByEmail = await this.userRepository.findByEmail(email);
    if (existingUserByEmail) {
      throw new Error("邮箱已被使用");
    }
  }

  /**
   * 根据用户名或邮箱查找用户
   */
  private async findUserByUsernameOrEmail(
    usernameOrEmail: string
  ): Promise<User | null> {
    // 简单判断是否为邮箱格式
    if (usernameOrEmail.includes("@")) {
      return await this.userRepository.findByEmail(usernameOrEmail);
    } else {
      return await this.userRepository.findByUsername(usernameOrEmail);
    }
  }

  /**
   * 发送欢迎邮件
   */
  private async sendWelcomeEmail(user: User): Promise<void> {
    try {
      await this.emailService.sendWelcomeEmail(user.email, user.username);
    } catch (error) {
      // 邮件发送失败不应该影响用户注册
      console.error("发送欢迎邮件失败:", error);
    }
  }

  /**
   * 生成重置令牌
   */
  private generateResetToken(): string {
    // 这里应该使用安全的令牌生成算法
    return (
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15)
    );
  }

  /**
   * 验证邮箱令牌
   */
  private validateEmailToken(token: string): boolean {
    // 这里应该实现真正的令牌验证逻辑
    return Boolean(token && token.length > 10);
  }

  /**
   * 验证密码强度
   */
  private isValidPassword(password: string): boolean {
    // 至少8位，包含字母和数字
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*?&]{8,}$/;
    return passwordRegex.test(password);
  }

  /**
   * 验证用户名格式
   */
  private isValidUsername(username: string): boolean {
    // 3-20位字母数字组合
    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
    return usernameRegex.test(username);
  }

  /**
   * 验证邮箱格式
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}
