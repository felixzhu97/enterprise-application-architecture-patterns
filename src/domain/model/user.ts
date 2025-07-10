/**
 * 用户领域模型
 * 演示 Domain Model 模式
 *
 * Domain Model 是包含行为和数据的对象模型。
 * 它将业务逻辑和规则封装在领域对象中。
 */

import { DomainObject } from "../../patterns/base/layer-supertype";
import { v4 as uuidv4 } from "uuid";
import bcrypt from "bcryptjs";

/**
 * 用户状态枚举
 */
export enum UserStatus {
  ACTIVE = "active",
  INACTIVE = "inactive",
  SUSPENDED = "suspended",
  DELETED = "deleted",
}

/**
 * 用户角色枚举
 */
export enum UserRole {
  CUSTOMER = "customer",
  ADMIN = "admin",
  MANAGER = "manager",
}

/**
 * 用户资料值对象
 */
export class UserProfile {
  constructor(
    public readonly firstName: string,
    public readonly lastName: string,
    public readonly phone?: string,
    public readonly avatar?: string,
    public readonly dateOfBirth?: Date
  ) {
    this.validateProfile();
  }

  private validateProfile(): void {
    if (!this.firstName || this.firstName.trim().length === 0) {
      throw new Error("姓名不能为空");
    }
    if (!this.lastName || this.lastName.trim().length === 0) {
      throw new Error("姓氏不能为空");
    }
    if (this.phone && !this.isValidPhone(this.phone)) {
      throw new Error("手机号码格式不正确");
    }
  }

  private isValidPhone(phone: string): boolean {
    const phoneRegex = /^1[3-9]\d{9}$/;
    return phoneRegex.test(phone);
  }

  public getFullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }

  public getDisplayName(): string {
    return this.getFullName();
  }

  public updateProfile(
    updates: Partial<{
      firstName: string;
      lastName: string;
      phone: string;
      avatar: string;
      dateOfBirth: Date;
    }>
  ): UserProfile {
    return new UserProfile(
      updates.firstName ?? this.firstName,
      updates.lastName ?? this.lastName,
      updates.phone ?? this.phone,
      updates.avatar ?? this.avatar,
      updates.dateOfBirth ?? this.dateOfBirth
    );
  }
}

/**
 * 用户地址值对象
 */
export class Address {
  constructor(
    public readonly street: string,
    public readonly city: string,
    public readonly province: string,
    public readonly postalCode: string,
    public readonly country: string = "中国"
  ) {
    this.validateAddress();
  }

  private validateAddress(): void {
    if (!this.street || this.street.trim().length === 0) {
      throw new Error("街道地址不能为空");
    }
    if (!this.city || this.city.trim().length === 0) {
      throw new Error("城市不能为空");
    }
    if (!this.province || this.province.trim().length === 0) {
      throw new Error("省份不能为空");
    }
    if (!this.postalCode || !this.isValidPostalCode(this.postalCode)) {
      throw new Error("邮政编码格式不正确");
    }
  }

  private isValidPostalCode(postalCode: string): boolean {
    const postalCodeRegex = /^\d{6}$/;
    return postalCodeRegex.test(postalCode);
  }

  public getFullAddress(): string {
    return `${this.country} ${this.province} ${this.city} ${this.street} ${this.postalCode}`;
  }

  public equals(other: Address): boolean {
    return (
      this.street === other.street &&
      this.city === other.city &&
      this.province === other.province &&
      this.postalCode === other.postalCode &&
      this.country === other.country
    );
  }
}

/**
 * 用户领域实体
 * 实现了丰富的领域模型，包含业务逻辑和规则
 */
export class User extends DomainObject {
  private _username: string;
  private _email: string;
  private _passwordHash: string;
  private _profile: UserProfile;
  private _status: UserStatus;
  private _role: UserRole;
  private _addresses: Address[];
  private _emailVerified: boolean;
  private _lastLoginAt?: Date;
  private _failedLoginAttempts: number;
  private _lockedUntil?: Date;

  constructor(
    username: string,
    email: string,
    password: string,
    profile: UserProfile,
    role: UserRole = UserRole.CUSTOMER,
    id?: string
  ) {
    super(id);
    this._username = username;
    this._email = email;
    this._passwordHash = this.hashPassword(password);
    this._profile = profile;
    this._status = UserStatus.ACTIVE;
    this._role = role;
    this._addresses = [];
    this._emailVerified = false;
    this._failedLoginAttempts = 0;

    this.validateUser();
  }

  // Getters
  public get username(): string {
    return this._username;
  }
  public get email(): string {
    return this._email;
  }
  public get passwordHash(): string {
    return this._passwordHash;
  }
  public get profile(): UserProfile {
    return this._profile;
  }
  public get status(): UserStatus {
    return this._status;
  }
  public get role(): UserRole {
    return this._role;
  }
  public get addresses(): Address[] {
    return [...this._addresses];
  }
  public get emailVerified(): boolean {
    return this._emailVerified;
  }
  public get lastLoginAt(): Date | undefined {
    return this._lastLoginAt;
  }
  public get failedLoginAttempts(): number {
    return this._failedLoginAttempts;
  }
  public get lockedUntil(): Date | undefined {
    return this._lockedUntil;
  }

  /**
   * 验证用户数据
   */
  private validateUser(): void {
    if (!this._username || this._username.trim().length < 3) {
      throw new Error("用户名至少需要3个字符");
    }
    if (!this.isValidEmail(this._email)) {
      throw new Error("邮箱格式不正确");
    }
    if (!this._profile) {
      throw new Error("用户资料不能为空");
    }
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * 密码相关方法
   */
  private hashPassword(password: string): string {
    if (!password || password.length < 6) {
      throw new Error("密码至少需要6个字符");
    }
    return bcrypt.hashSync(password, 12);
  }

  public verifyPassword(password: string): boolean {
    return bcrypt.compareSync(password, this._passwordHash);
  }

  public changePassword(oldPassword: string, newPassword: string): void {
    if (!this.verifyPassword(oldPassword)) {
      throw new Error("原密码不正确");
    }
    this._passwordHash = this.hashPassword(newPassword);
    this.markUpdated();
  }

  /**
   * 用户状态管理
   */
  public activate(): void {
    if (this._status === UserStatus.DELETED) {
      throw new Error("已删除的用户无法激活");
    }
    this._status = UserStatus.ACTIVE;
    this._lockedUntil = undefined;
    this._failedLoginAttempts = 0;
    this.markUpdated();
  }

  public deactivate(): void {
    this._status = UserStatus.INACTIVE;
    this.markUpdated();
  }

  public suspend(reason?: string): void {
    this._status = UserStatus.SUSPENDED;
    this.markUpdated();
    // 这里可以记录暂停原因
  }

  public delete(): void {
    this._status = UserStatus.DELETED;
    this.markUpdated();
  }

  public isActive(): boolean {
    return this._status === UserStatus.ACTIVE && !this.isLocked();
  }

  public isLocked(): boolean {
    return this._lockedUntil ? this._lockedUntil > new Date() : false;
  }

  /**
   * 登录相关方法
   */
  public recordSuccessfulLogin(): void {
    this._lastLoginAt = new Date();
    this._failedLoginAttempts = 0;
    this._lockedUntil = undefined;
    this.markUpdated();
  }

  public recordFailedLogin(): void {
    this._failedLoginAttempts++;

    // 连续失败3次后锁定账户30分钟
    if (this._failedLoginAttempts >= 3) {
      this._lockedUntil = new Date(Date.now() + 30 * 60 * 1000);
    }

    this.markUpdated();
  }

  /**
   * 邮箱验证
   */
  public verifyEmail(): void {
    this._emailVerified = true;
    this.markUpdated();
  }

  public changeEmail(newEmail: string): void {
    if (!this.isValidEmail(newEmail)) {
      throw new Error("邮箱格式不正确");
    }
    this._email = newEmail;
    this._emailVerified = false; // 需要重新验证
    this.markUpdated();
  }

  /**
   * 个人资料管理
   */
  public updateProfile(
    updates: Partial<{
      firstName: string;
      lastName: string;
      phone: string;
      avatar: string;
      dateOfBirth: Date;
    }>
  ): void {
    this._profile = this._profile.updateProfile(updates);
    this.markUpdated();
  }

  /**
   * 地址管理
   */
  public addAddress(address: Address): void {
    // 检查是否已存在相同地址
    const exists = this._addresses.some((addr) => addr.equals(address));
    if (exists) {
      throw new Error("地址已存在");
    }

    this._addresses.push(address);
    this.markUpdated();
  }

  public removeAddress(index: number): void {
    if (index < 0 || index >= this._addresses.length) {
      throw new Error("地址索引无效");
    }
    this._addresses.splice(index, 1);
    this.markUpdated();
  }

  public updateAddress(index: number, address: Address): void {
    if (index < 0 || index >= this._addresses.length) {
      throw new Error("地址索引无效");
    }
    this._addresses[index] = address;
    this.markUpdated();
  }

  public getDefaultAddress(): Address | undefined {
    return this._addresses[0]; // 假设第一个地址是默认地址
  }

  /**
   * 权限检查
   */
  public hasRole(role: UserRole): boolean {
    return this._role === role;
  }

  public isAdmin(): boolean {
    return this._role === UserRole.ADMIN;
  }

  public isManager(): boolean {
    return this._role === UserRole.MANAGER || this._role === UserRole.ADMIN;
  }

  public canManageUsers(): boolean {
    return this.isAdmin();
  }

  public canManageProducts(): boolean {
    return this.isManager();
  }

  public canViewReports(): boolean {
    return this.isManager();
  }

  /**
   * Domain Object 抽象方法实现
   */
  public clone(): User {
    const cloned = new User(
      this._username,
      this._email,
      "dummy", // 克隆时不复制密码
      this._profile,
      this._role,
      this.getId()
    );

    // 复制其他属性
    cloned._status = this._status;
    cloned._addresses = [...this._addresses];
    cloned._emailVerified = this._emailVerified;
    cloned._lastLoginAt = this._lastLoginAt;
    cloned._failedLoginAttempts = this._failedLoginAttempts;
    cloned._lockedUntil = this._lockedUntil;

    return cloned;
  }

  public isValid(): boolean {
    try {
      this.validateUser();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 业务规则方法
   */
  public canPlaceOrder(): boolean {
    return this.isActive() && this._emailVerified;
  }

  public canWriteReview(): boolean {
    return this.isActive() && this._emailVerified;
  }

  public toString(): string {
    return `User(${this._username}, ${this._email}, ${this._status})`;
  }
}
