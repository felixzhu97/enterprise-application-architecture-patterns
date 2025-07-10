/**
 * Layer Supertype（层超类型）模式
 *
 * 为某一层中的所有类型提供通用功能的基类型。
 * 这个模式通过继承为一层中的所有对象提供共同的功能。
 *
 * 优点：
 * - 消除重复代码
 * - 提供层级通用功能
 * - 便于维护和扩展
 *
 * 使用场景：
 * - 当一层中的多个类需要相同功能时
 * - 需要统一处理某些横切关注点时
 */

import { v4 as uuidv4 } from "uuid";

/**
 * 领域对象超类型
 * 为所有领域对象提供通用功能
 */
export abstract class DomainObject {
  protected id: string;
  protected version: number;
  protected createdAt: Date;
  protected updatedAt: Date;

  constructor(id?: string) {
    this.id = id || uuidv4();
    this.version = 0;
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }

  /**
   * 获取对象标识
   */
  public getId(): string {
    return this.id;
  }

  /**
   * 获取版本号（用于乐观锁）
   */
  public getVersion(): number {
    return this.version;
  }

  /**
   * 增加版本号
   */
  public incrementVersion(): void {
    this.version++;
    this.updatedAt = new Date();
  }

  /**
   * 获取创建时间
   */
  public getCreatedAt(): Date {
    return this.createdAt;
  }

  /**
   * 获取更新时间
   */
  public getUpdatedAt(): Date {
    return this.updatedAt;
  }

  /**
   * 标记为已更新
   */
  protected markUpdated(): void {
    this.updatedAt = new Date();
  }

  /**
   * 对象相等性比较
   */
  public equals(other: DomainObject): boolean {
    return this.id === other.id;
  }

  /**
   * 获取对象哈希码
   */
  public hashCode(): string {
    return this.id;
  }

  /**
   * 克隆对象
   */
  public abstract clone(): DomainObject;

  /**
   * 验证对象状态
   */
  public abstract isValid(): boolean;
}

/**
 * 数据访问对象超类型
 * 为所有数据访问对象提供通用功能
 */
export abstract class DataAccessObject {
  /**
   * 执行数据库操作的通用方法
   */
  protected async executeQuery<T>(
    query: string,
    parameters: any[] = []
  ): Promise<T[]> {
    // 这里会使用实际的数据库连接
    // 演示通用的查询执行逻辑
    console.log(`执行查询: ${query}`, parameters);

    // 添加日志记录
    this.logQuery(query, parameters);

    // 实际实现中会执行数据库查询
    return [] as T[];
  }

  /**
   * 记录查询日志
   */
  private logQuery(query: string, parameters: any[]): void {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] SQL: ${query}`);
    if (parameters.length > 0) {
      console.log(`[${timestamp}] Parameters:`, parameters);
    }
  }

  /**
   * 处理数据库错误
   */
  protected handleDatabaseError(error: Error, operation: string): never {
    console.error(`数据库操作失败 [${operation}]:`, error.message);
    throw new Error(`数据库操作失败: ${operation} - ${error.message}`);
  }

  /**
   * 开始事务
   */
  protected async beginTransaction(): Promise<void> {
    console.log("开始事务");
  }

  /**
   * 提交事务
   */
  protected async commitTransaction(): Promise<void> {
    console.log("提交事务");
  }

  /**
   * 回滚事务
   */
  protected async rollbackTransaction(): Promise<void> {
    console.log("回滚事务");
  }
}

/**
 * Web控制器超类型
 * 为所有Web控制器提供通用功能
 */
export abstract class WebController {
  /**
   * 处理请求的通用逻辑
   */
  protected handleRequest<T>(
    request: any,
    response: any,
    action: () => Promise<T>
  ): Promise<void> {
    return this.executeWithErrorHandling(async () => {
      // 记录请求
      this.logRequest(request);

      // 验证请求
      this.validateRequest(request);

      // 执行具体操作
      const result = await action();

      // 发送响应
      this.sendSuccessResponse(response, result);
    }, response);
  }

  /**
   * 错误处理包装器
   */
  private async executeWithErrorHandling(
    action: () => Promise<void>,
    response: any
  ): Promise<void> {
    try {
      await action();
    } catch (error) {
      this.handleError(error as Error, response);
    }
  }

  /**
   * 记录请求日志
   */
  private logRequest(request: any): void {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${request.method} ${request.url}`);
  }

  /**
   * 验证请求
   */
  protected validateRequest(request: any): void {
    // 基础验证逻辑
    if (!request) {
      throw new Error("请求对象不能为空");
    }
  }

  /**
   * 发送成功响应
   */
  protected sendSuccessResponse(response: any, data: any): void {
    response.status(200).json({
      success: true,
      data: data,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * 处理错误
   */
  protected handleError(error: Error, response: any): void {
    console.error("控制器错误:", error.message);

    response.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * 服务层超类型
 * 为所有服务类提供通用功能
 */
export abstract class ServiceObject {
  /**
   * 执行服务操作的通用方法
   */
  protected async executeService<T>(
    operation: string,
    action: () => Promise<T>
  ): Promise<T> {
    const startTime = Date.now();

    try {
      this.logServiceStart(operation);

      const result = await action();

      this.logServiceSuccess(operation, Date.now() - startTime);
      return result;
    } catch (error) {
      this.logServiceError(operation, error as Error, Date.now() - startTime);
      throw error;
    }
  }

  /**
   * 记录服务开始
   */
  private logServiceStart(operation: string): void {
    console.log(`服务操作开始: ${operation}`);
  }

  /**
   * 记录服务成功
   */
  private logServiceSuccess(operation: string, duration: number): void {
    console.log(`服务操作成功: ${operation} (耗时: ${duration}ms)`);
  }

  /**
   * 记录服务错误
   */
  private logServiceError(
    operation: string,
    error: Error,
    duration: number
  ): void {
    console.error(
      `服务操作失败: ${operation} (耗时: ${duration}ms)`,
      error.message
    );
  }

  /**
   * 验证业务规则
   */
  protected validateBusinessRules(rules: (() => boolean)[]): void {
    for (const rule of rules) {
      if (!rule()) {
        throw new Error("业务规则验证失败");
      }
    }
  }
}
