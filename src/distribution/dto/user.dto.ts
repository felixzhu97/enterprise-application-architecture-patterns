/**
 * 用户数据传输对象 (DTO)
 * 演示 Data Transfer Object 模式
 *
 * DTOs用于在分布式系统组件之间传输数据
 */

/**
 * 用户基本信息DTO
 */
export class UserDTO {
  constructor(
    public readonly id: string,
    public readonly username: string,
    public readonly email: string,
    public readonly firstName: string,
    public readonly lastName: string,
    public readonly phone?: string,
    public readonly avatar?: string,
    public readonly status?: string,
    public readonly role?: string,
    public readonly emailVerified?: boolean,
    public readonly createdAt?: Date,
    public readonly updatedAt?: Date
  ) {}

  /**
   * 获取用户全名
   */
  get fullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }

  /**
   * 转换为普通对象
   */
  toObject(): Record<string, any> {
    return {
      id: this.id,
      username: this.username,
      email: this.email,
      firstName: this.firstName,
      lastName: this.lastName,
      fullName: this.fullName,
      phone: this.phone,
      avatar: this.avatar,
      status: this.status,
      role: this.role,
      emailVerified: this.emailVerified,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  /**
   * 从普通对象创建DTO
   */
  static fromObject(obj: any): UserDTO {
    return new UserDTO(
      obj.id,
      obj.username,
      obj.email,
      obj.firstName,
      obj.lastName,
      obj.phone,
      obj.avatar,
      obj.status,
      obj.role,
      obj.emailVerified,
      obj.createdAt ? new Date(obj.createdAt) : undefined,
      obj.updatedAt ? new Date(obj.updatedAt) : undefined
    );
  }
}

/**
 * 用户列表项DTO
 * 用于列表显示的简化用户信息
 */
export class UserListItemDTO {
  constructor(
    public readonly id: string,
    public readonly username: string,
    public readonly email: string,
    public readonly fullName: string,
    public readonly status: string,
    public readonly role: string,
    public readonly emailVerified: boolean,
    public readonly lastLoginAt?: Date,
    public readonly createdAt?: Date
  ) {}
}

/**
 * 用户注册请求DTO
 */
export class UserRegistrationDTO {
  constructor(
    public readonly username: string,
    public readonly email: string,
    public readonly password: string,
    public readonly firstName: string,
    public readonly lastName: string,
    public readonly phone?: string
  ) {}

  /**
   * 验证数据完整性
   */
  validate(): string[] {
    const errors: string[] = [];

    if (!this.username || this.username.trim().length < 3) {
      errors.push("用户名至少需要3个字符");
    }

    if (!this.email || !this.isValidEmail(this.email)) {
      errors.push("请输入有效的邮箱地址");
    }

    if (!this.password || this.password.length < 8) {
      errors.push("密码至少需要8个字符");
    }

    if (!this.firstName || !this.lastName) {
      errors.push("请输入完整的姓名");
    }

    return errors;
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}

/**
 * 用户登录请求DTO
 */
export class UserLoginDTO {
  constructor(
    public readonly username: string,
    public readonly password: string,
    public readonly rememberMe?: boolean
  ) {}
}

/**
 * 用户登录响应DTO
 */
export class UserLoginResponseDTO {
  constructor(
    public readonly success: boolean,
    public readonly user?: UserDTO,
    public readonly token?: string,
    public readonly message?: string,
    public readonly requiresEmailVerification?: boolean
  ) {}
}

/**
 * 用户资料更新DTO
 */
export class UserProfileUpdateDTO {
  constructor(
    public readonly firstName?: string,
    public readonly lastName?: string,
    public readonly phone?: string,
    public readonly avatar?: string,
    public readonly dateOfBirth?: Date
  ) {}
}

/**
 * 用户统计DTO
 */
export class UserStatisticsDTO {
  constructor(
    public readonly totalUsers: number,
    public readonly activeUsers: number,
    public readonly newUsersThisMonth: number,
    public readonly suspendedUsers: number,
    public readonly deletedUsers: number = 0
  ) {}

  /**
   * 计算活跃用户百分比
   */
  get activeUserPercentage(): number {
    return this.totalUsers > 0 ? (this.activeUsers / this.totalUsers) * 100 : 0;
  }
}

/**
 * 分页用户列表DTO
 */
export class PaginatedUserListDTO {
  constructor(
    public readonly users: UserListItemDTO[],
    public readonly totalItems: number,
    public readonly currentPage: number,
    public readonly pageSize: number,
    public readonly totalPages: number
  ) {}

  /**
   * 是否有下一页
   */
  get hasNextPage(): boolean {
    return this.currentPage < this.totalPages;
  }

  /**
   * 是否有上一页
   */
  get hasPreviousPage(): boolean {
    return this.currentPage > 1;
  }
}
