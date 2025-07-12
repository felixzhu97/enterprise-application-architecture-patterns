/**
 * Query Object（查询对象）模式
 *
 * 用对象来表示数据库查询，能够由解释器处理。
 * Query Object允许你将查询逻辑封装在对象中，使查询可以被组合、重用和测试。
 *
 * 主要特点：
 * - 封装查询逻辑
 * - 支持查询组合
 * - 类型安全的查询构建
 * - 可测试的查询逻辑
 * - 支持动态查询构建
 *
 * 优点：
 * - 查询逻辑可重用
 * - 类型安全
 * - 易于测试
 * - 支持复杂查询组合
 * - 分离查询构建和执行
 *
 * 缺点：
 * - 增加系统复杂性
 * - 可能过度抽象
 * - 性能开销
 * - 调试困难
 *
 * 适用场景：
 * - 复杂的查询逻辑
 * - 需要动态构建查询
 * - 查询需要复用
 * - 需要类型安全的查询
 */

import { DataSource, QueryRunner, SelectQueryBuilder } from "typeorm";

/**
 * 查询对象异常
 */
export class QueryObjectException extends Error {
  constructor(message: string, public readonly cause?: Error) {
    super(message);
    this.name = "QueryObjectException";
  }
}

/**
 * 查询条件操作符
 */
export enum QueryOperator {
  EQUALS = "=",
  NOT_EQUALS = "!=",
  GREATER_THAN = ">",
  GREATER_THAN_OR_EQUAL = ">=",
  LESS_THAN = "<",
  LESS_THAN_OR_EQUAL = "<=",
  LIKE = "LIKE",
  IN = "IN",
  NOT_IN = "NOT IN",
  IS_NULL = "IS NULL",
  IS_NOT_NULL = "IS NOT NULL",
  BETWEEN = "BETWEEN",
}

/**
 * 逻辑操作符
 */
export enum LogicalOperator {
  AND = "AND",
  OR = "OR",
  NOT = "NOT",
}

/**
 * 排序方向
 */
export enum SortDirection {
  ASC = "ASC",
  DESC = "DESC",
}

/**
 * 查询条件
 */
export interface QueryCondition {
  field: string;
  operator: QueryOperator;
  value?: any;
  values?: any[];
}

/**
 * 逻辑条件
 */
export interface LogicalCondition {
  operator: LogicalOperator;
  conditions: (QueryCondition | LogicalCondition)[];
}

/**
 * 排序条件
 */
export interface SortCondition {
  field: string;
  direction: SortDirection;
}

/**
 * 连接条件
 */
export interface JoinCondition {
  table: string;
  alias: string;
  condition: string;
  type: "INNER" | "LEFT" | "RIGHT" | "FULL";
}

/**
 * 查询结果
 */
export interface QueryResult<T = any> {
  data: T[];
  totalCount?: number;
  executionTime?: number;
  query?: string;
  parameters?: any[];
}

/**
 * 抽象查询对象
 */
export abstract class QueryObject<T = any> {
  protected tableName: string;
  protected tableAlias: string;
  protected selectFields: string[] = [];
  protected whereConditions: (QueryCondition | LogicalCondition)[] = [];
  protected joinConditions: JoinCondition[] = [];
  protected sortConditions: SortCondition[] = [];
  protected groupByFields: string[] = [];
  protected havingConditions: (QueryCondition | LogicalCondition)[] = [];
  protected limitValue?: number;
  protected offsetValue?: number;
  protected distinctValue: boolean = false;

  constructor(tableName: string, tableAlias: string = "t") {
    this.tableName = tableName;
    this.tableAlias = tableAlias;
  }

  /**
   * 选择字段
   */
  public select(fields: string[]): this {
    this.selectFields = fields;
    return this;
  }

  /**
   * 添加查询条件
   */
  public where(condition: QueryCondition | LogicalCondition): this {
    this.whereConditions.push(condition);
    return this;
  }

  /**
   * 添加简单条件
   */
  public whereEquals(field: string, value: any): this {
    return this.where({ field, operator: QueryOperator.EQUALS, value });
  }

  /**
   * 添加LIKE条件
   */
  public whereLike(field: string, value: string): this {
    return this.where({ field, operator: QueryOperator.LIKE, value });
  }

  /**
   * 添加IN条件
   */
  public whereIn(field: string, values: any[]): this {
    return this.where({ field, operator: QueryOperator.IN, values });
  }

  /**
   * 添加BETWEEN条件
   */
  public whereBetween(field: string, min: any, max: any): this {
    return this.where({
      field,
      operator: QueryOperator.BETWEEN,
      values: [min, max],
    });
  }

  /**
   * 添加AND条件组
   */
  public whereAnd(conditions: (QueryCondition | LogicalCondition)[]): this {
    return this.where({ operator: LogicalOperator.AND, conditions });
  }

  /**
   * 添加OR条件组
   */
  public whereOr(conditions: (QueryCondition | LogicalCondition)[]): this {
    return this.where({ operator: LogicalOperator.OR, conditions });
  }

  /**
   * 添加连接
   */
  public join(
    table: string,
    alias: string,
    condition: string,
    type: "INNER" | "LEFT" | "RIGHT" | "FULL" = "INNER"
  ): this {
    this.joinConditions.push({ table, alias, condition, type });
    return this;
  }

  /**
   * 添加内连接
   */
  public innerJoin(table: string, alias: string, condition: string): this {
    return this.join(table, alias, condition, "INNER");
  }

  /**
   * 添加左连接
   */
  public leftJoin(table: string, alias: string, condition: string): this {
    return this.join(table, alias, condition, "LEFT");
  }

  /**
   * 添加排序
   */
  public orderBy(
    field: string,
    direction: SortDirection = SortDirection.ASC
  ): this {
    this.sortConditions.push({ field, direction });
    return this;
  }

  /**
   * 添加分组
   */
  public groupBy(fields: string[]): this {
    this.groupByFields = fields;
    return this;
  }

  /**
   * 添加HAVING条件
   */
  public having(condition: QueryCondition | LogicalCondition): this {
    this.havingConditions.push(condition);
    return this;
  }

  /**
   * 设置限制数量
   */
  public limit(count: number): this {
    this.limitValue = count;
    return this;
  }

  /**
   * 设置偏移量
   */
  public offset(count: number): this {
    this.offsetValue = count;
    return this;
  }

  /**
   * 设置去重
   */
  public distinct(): this {
    this.distinctValue = true;
    return this;
  }

  /**
   * 构建SQL查询
   */
  public abstract buildQuery(): { sql: string; parameters: any[] };

  /**
   * 执行查询
   */
  public abstract execute(dataSource: DataSource): Promise<QueryResult<T>>;

  /**
   * 克隆查询对象
   */
  public abstract clone(): QueryObject<T>;

  /**
   * 构建WHERE子句
   */
  protected buildWhereClause(
    conditions: (QueryCondition | LogicalCondition)[]
  ): { sql: string; parameters: any[] } {
    if (conditions.length === 0) {
      return { sql: "", parameters: [] };
    }

    const parts: string[] = [];
    const parameters: any[] = [];

    for (const condition of conditions) {
      if (this.isQueryCondition(condition)) {
        const { sql, params } = this.buildSingleCondition(condition);
        parts.push(sql);
        parameters.push(...params);
      } else {
        const { sql, params } = this.buildLogicalCondition(condition);
        parts.push(sql);
        parameters.push(...params);
      }
    }

    return {
      sql: parts.length > 1 ? `(${parts.join(" AND ")})` : parts[0],
      parameters,
    };
  }

  /**
   * 构建单个条件
   */
  private buildSingleCondition(condition: QueryCondition): {
    sql: string;
    params: any[];
  } {
    const field = condition.field.includes(".")
      ? condition.field
      : `${this.tableAlias}.${condition.field}`;

    switch (condition.operator) {
      case QueryOperator.IS_NULL:
        return { sql: `${field} IS NULL`, params: [] };
      case QueryOperator.IS_NOT_NULL:
        return { sql: `${field} IS NOT NULL`, params: [] };
      case QueryOperator.IN:
      case QueryOperator.NOT_IN:
        if (!condition.values || condition.values.length === 0) {
          return { sql: "1=0", params: [] };
        }
        const placeholders = condition.values.map(() => "?").join(", ");
        return {
          sql: `${field} ${condition.operator} (${placeholders})`,
          params: condition.values,
        };
      case QueryOperator.BETWEEN:
        if (!condition.values || condition.values.length !== 2) {
          throw new QueryObjectException(
            "BETWEEN operator requires exactly 2 values"
          );
        }
        return { sql: `${field} BETWEEN ? AND ?`, params: condition.values };
      default:
        return {
          sql: `${field} ${condition.operator} ?`,
          params: [condition.value],
        };
    }
  }

  /**
   * 构建逻辑条件
   */
  private buildLogicalCondition(condition: LogicalCondition): {
    sql: string;
    params: any[];
  } {
    const parts: string[] = [];
    const parameters: any[] = [];

    for (const subCondition of condition.conditions) {
      if (this.isQueryCondition(subCondition)) {
        const { sql, params } = this.buildSingleCondition(subCondition);
        parts.push(sql);
        parameters.push(...params);
      } else {
        const { sql, params } = this.buildLogicalCondition(subCondition);
        parts.push(`(${sql})`);
        parameters.push(...params);
      }
    }

    const operator =
      condition.operator === LogicalOperator.NOT ? "NOT" : condition.operator;
    if (condition.operator === LogicalOperator.NOT) {
      return { sql: `NOT (${parts.join(" AND ")})`, params: parameters };
    }

    return { sql: parts.join(` ${operator} `), params: parameters };
  }

  /**
   * 检查是否为查询条件
   */
  private isQueryCondition(
    condition: QueryCondition | LogicalCondition
  ): condition is QueryCondition {
    return "field" in condition && "operator" in condition;
  }
}

/**
 * SQL查询对象
 */
export class SqlQueryObject<T = any> extends QueryObject<T> {
  constructor(tableName: string, tableAlias: string = "t") {
    super(tableName, tableAlias);
  }

  /**
   * 构建SQL查询
   */
  public buildQuery(): { sql: string; parameters: any[] } {
    const parameters: any[] = [];
    const parts: string[] = [];

    // SELECT子句
    const selectClause = this.buildSelectClause();
    parts.push(selectClause);

    // FROM子句
    parts.push(`FROM ${this.tableName} ${this.tableAlias}`);

    // JOIN子句
    if (this.joinConditions.length > 0) {
      for (const join of this.joinConditions) {
        parts.push(
          `${join.type} JOIN ${join.table} ${join.alias} ON ${join.condition}`
        );
      }
    }

    // WHERE子句
    if (this.whereConditions.length > 0) {
      const { sql, parameters: whereParams } = this.buildWhereClause(
        this.whereConditions
      );
      parts.push(`WHERE ${sql}`);
      parameters.push(...whereParams);
    }

    // GROUP BY子句
    if (this.groupByFields.length > 0) {
      parts.push(`GROUP BY ${this.groupByFields.join(", ")}`);
    }

    // HAVING子句
    if (this.havingConditions.length > 0) {
      const { sql, parameters: havingParams } = this.buildWhereClause(
        this.havingConditions
      );
      parts.push(`HAVING ${sql}`);
      parameters.push(...havingParams);
    }

    // ORDER BY子句
    if (this.sortConditions.length > 0) {
      const orderParts = this.sortConditions.map(
        (sort) => `${sort.field} ${sort.direction}`
      );
      parts.push(`ORDER BY ${orderParts.join(", ")}`);
    }

    // LIMIT子句
    if (this.limitValue !== undefined) {
      parts.push(`LIMIT ${this.limitValue}`);
    }

    // OFFSET子句
    if (this.offsetValue !== undefined) {
      parts.push(`OFFSET ${this.offsetValue}`);
    }

    return { sql: parts.join(" "), parameters };
  }

  /**
   * 执行查询
   */
  public async execute(dataSource: DataSource): Promise<QueryResult<T>> {
    const startTime = Date.now();
    const { sql, parameters } = this.buildQuery();

    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();

    try {
      const data = await queryRunner.query(sql, parameters);
      const executionTime = Date.now() - startTime;

      return {
        data,
        executionTime,
        query: sql,
        parameters,
      };
    } catch (error) {
      throw new QueryObjectException("Failed to execute query", error as Error);
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * 执行计数查询
   */
  public async executeCount(dataSource: DataSource): Promise<number> {
    const countQuery = this.clone();
    countQuery.selectFields = ["COUNT(*) as count"];
    countQuery.sortConditions = [];
    countQuery.limitValue = undefined;
    countQuery.offsetValue = undefined;

    const result = await countQuery.execute(dataSource);
    return result.data[0]?.count || 0;
  }

  /**
   * 克隆查询对象
   */
  public clone(): SqlQueryObject<T> {
    const cloned = new SqlQueryObject<T>(this.tableName, this.tableAlias);
    cloned.selectFields = [...this.selectFields];
    cloned.whereConditions = [...this.whereConditions];
    cloned.joinConditions = [...this.joinConditions];
    cloned.sortConditions = [...this.sortConditions];
    cloned.groupByFields = [...this.groupByFields];
    cloned.havingConditions = [...this.havingConditions];
    cloned.limitValue = this.limitValue;
    cloned.offsetValue = this.offsetValue;
    cloned.distinctValue = this.distinctValue;
    return cloned;
  }

  /**
   * 构建SELECT子句
   */
  private buildSelectClause(): string {
    const distinct = this.distinctValue ? "DISTINCT " : "";
    const fields =
      this.selectFields.length > 0 ? this.selectFields.join(", ") : "*";
    return `SELECT ${distinct}${fields}`;
  }
}

/**
 * TypeORM查询对象
 */
export class TypeOrmQueryObject<T = any> extends QueryObject<T> {
  private entityClass: any;

  constructor(entityClass: any, tableName: string, tableAlias: string = "t") {
    super(tableName, tableAlias);
    this.entityClass = entityClass;
  }

  /**
   * 构建TypeORM查询
   */
  public buildQuery(): { sql: string; parameters: any[] } {
    // TypeORM查询对象不直接返回SQL，而是通过QueryBuilder构建
    throw new Error("Use buildQueryBuilder() for TypeORM queries");
  }

  /**
   * 构建QueryBuilder
   */
  public buildQueryBuilder(dataSource: DataSource): SelectQueryBuilder<T> {
    const repository = dataSource.getRepository(this.entityClass);
    let queryBuilder = repository.createQueryBuilder(this.tableAlias);

    // SELECT
    if (this.selectFields.length > 0) {
      queryBuilder = queryBuilder.select(this.selectFields);
    }

    // DISTINCT
    if (this.distinctValue) {
      queryBuilder = queryBuilder.distinct();
    }

    // JOIN
    for (const join of this.joinConditions) {
      switch (join.type) {
        case "INNER":
          queryBuilder = queryBuilder.innerJoin(
            join.table,
            join.alias,
            join.condition
          );
          break;
        case "LEFT":
          queryBuilder = queryBuilder.leftJoin(
            join.table,
            join.alias,
            join.condition
          );
          break;
        case "RIGHT":
          queryBuilder = queryBuilder.rightJoin(
            join.table,
            join.alias,
            join.condition
          );
          break;
        case "FULL":
          // TypeORM doesn't support FULL JOIN directly
          break;
      }
    }

    // WHERE
    if (this.whereConditions.length > 0) {
      const { sql, parameters } = this.buildWhereClause(this.whereConditions);
      queryBuilder = queryBuilder.where(sql, parameters);
    }

    // GROUP BY
    if (this.groupByFields.length > 0) {
      queryBuilder = queryBuilder.groupBy(this.groupByFields.join(", "));
    }

    // HAVING
    if (this.havingConditions.length > 0) {
      const { sql, parameters } = this.buildWhereClause(this.havingConditions);
      queryBuilder = queryBuilder.having(sql, parameters);
    }

    // ORDER BY
    for (const sort of this.sortConditions) {
      queryBuilder = queryBuilder.addOrderBy(sort.field, sort.direction);
    }

    // LIMIT
    if (this.limitValue !== undefined) {
      queryBuilder = queryBuilder.limit(this.limitValue);
    }

    // OFFSET
    if (this.offsetValue !== undefined) {
      queryBuilder = queryBuilder.offset(this.offsetValue);
    }

    return queryBuilder;
  }

  /**
   * 执行查询
   */
  public async execute(dataSource: DataSource): Promise<QueryResult<T>> {
    const startTime = Date.now();
    const queryBuilder = this.buildQueryBuilder(dataSource);

    try {
      const [data, totalCount] = await queryBuilder.getManyAndCount();
      const executionTime = Date.now() - startTime;

      return {
        data,
        totalCount,
        executionTime,
        query: queryBuilder.getSql(),
        parameters: queryBuilder.getParameters(),
      };
    } catch (error) {
      throw new QueryObjectException(
        "Failed to execute TypeORM query",
        error as Error
      );
    }
  }

  /**
   * 克隆查询对象
   */
  public clone(): TypeOrmQueryObject<T> {
    const cloned = new TypeOrmQueryObject<T>(
      this.entityClass,
      this.tableName,
      this.tableAlias
    );
    cloned.selectFields = [...this.selectFields];
    cloned.whereConditions = [...this.whereConditions];
    cloned.joinConditions = [...this.joinConditions];
    cloned.sortConditions = [...this.sortConditions];
    cloned.groupByFields = [...this.groupByFields];
    cloned.havingConditions = [...this.havingConditions];
    cloned.limitValue = this.limitValue;
    cloned.offsetValue = this.offsetValue;
    cloned.distinctValue = this.distinctValue;
    return cloned;
  }
}

/**
 * 预定义查询对象
 */
export class UserQueryObject extends SqlQueryObject {
  constructor() {
    super("users", "u");
  }

  /**
   * 根据邮箱查询用户
   */
  public byEmail(email: string): this {
    return this.whereEquals("email", email);
  }

  /**
   * 根据用户名查询用户
   */
  public byUsername(username: string): this {
    return this.whereEquals("username", username);
  }

  /**
   * 查询活跃用户
   */
  public activeUsers(): this {
    return this.whereEquals("is_active", true);
  }

  /**
   * 查询指定日期后注册的用户
   */
  public registeredAfter(date: Date): this {
    return this.where({
      field: "created_at",
      operator: QueryOperator.GREATER_THAN,
      value: date,
    });
  }

  /**
   * 根据邮箱模糊查询
   */
  public emailLike(pattern: string): this {
    return this.whereLike("email", `%${pattern}%`);
  }

  /**
   * 查询VIP用户
   */
  public vipUsers(): this {
    return this.whereEquals("user_type", "VIP");
  }

  /**
   * 组合查询：活跃的VIP用户
   */
  public activeVipUsers(): this {
    return this.activeUsers().vipUsers();
  }
}

/**
 * 产品查询对象
 */
export class ProductQueryObject extends SqlQueryObject {
  constructor() {
    super("products", "p");
  }

  /**
   * 根据类别查询产品
   */
  public byCategory(category: string): this {
    return this.whereEquals("category", category);
  }

  /**
   * 根据价格范围查询
   */
  public priceRange(minPrice: number, maxPrice: number): this {
    return this.whereBetween("price", minPrice, maxPrice);
  }

  /**
   * 查询有库存的产品
   */
  public inStock(): this {
    return this.where({
      field: "stock",
      operator: QueryOperator.GREATER_THAN,
      value: 0,
    });
  }

  /**
   * 查询可用产品
   */
  public available(): this {
    return this.whereEquals("is_available", true);
  }

  /**
   * 根据名称模糊查询
   */
  public nameLike(pattern: string): this {
    return this.whereLike("name", `%${pattern}%`);
  }

  /**
   * 查询畅销产品
   */
  public bestsellers(limit: number = 10): this {
    return this.orderBy("sold_count", SortDirection.DESC).limit(limit);
  }

  /**
   * 查询低库存产品
   */
  public lowStock(threshold: number = 10): this {
    return this.where({
      field: "stock",
      operator: QueryOperator.LESS_THAN,
      value: threshold,
    });
  }

  /**
   * 组合查询：可用且有库存的产品
   */
  public availableAndInStock(): this {
    return this.available().inStock();
  }
}

/**
 * 订单查询对象
 */
export class OrderQueryObject extends SqlQueryObject {
  constructor() {
    super("orders", "o");
  }

  /**
   * 根据用户ID查询订单
   */
  public byUserId(userId: number): this {
    return this.whereEquals("user_id", userId);
  }

  /**
   * 根据状态查询订单
   */
  public byStatus(status: string): this {
    return this.whereEquals("status", status);
  }

  /**
   * 根据日期范围查询订单
   */
  public byDateRange(startDate: Date, endDate: Date): this {
    return this.whereBetween("order_date", startDate, endDate);
  }

  /**
   * 查询待处理订单
   */
  public pending(): this {
    return this.byStatus("pending");
  }

  /**
   * 查询已完成订单
   */
  public completed(): this {
    return this.byStatus("completed");
  }

  /**
   * 查询高价值订单
   */
  public highValue(minAmount: number): this {
    return this.where({
      field: "total",
      operator: QueryOperator.GREATER_THAN_OR_EQUAL,
      value: minAmount,
    });
  }

  /**
   * 连接用户表查询
   */
  public withUser(): this {
    return this.innerJoin("users", "u", "o.user_id = u.id");
  }

  /**
   * 连接订单项表查询
   */
  public withItems(): this {
    return this.leftJoin("order_items", "oi", "o.id = oi.order_id");
  }

  /**
   * 查询今日订单
   */
  public today(): this {
    const today = new Date();
    const startOfDay = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    );
    const endOfDay = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate() + 1
    );
    return this.byDateRange(startOfDay, endOfDay);
  }
}

/**
 * 查询工厂
 */
export class QueryFactory {
  /**
   * 创建用户查询对象
   */
  public static createUserQuery(): UserQueryObject {
    return new UserQueryObject();
  }

  /**
   * 创建产品查询对象
   */
  public static createProductQuery(): ProductQueryObject {
    return new ProductQueryObject();
  }

  /**
   * 创建订单查询对象
   */
  public static createOrderQuery(): OrderQueryObject {
    return new OrderQueryObject();
  }

  /**
   * 创建自定义SQL查询对象
   */
  public static createSqlQuery<T = any>(
    tableName: string,
    tableAlias?: string
  ): SqlQueryObject<T> {
    return new SqlQueryObject<T>(tableName, tableAlias);
  }

  /**
   * 创建TypeORM查询对象
   */
  public static createTypeOrmQuery<T = any>(
    entityClass: any,
    tableName: string,
    tableAlias?: string
  ): TypeOrmQueryObject<T> {
    return new TypeOrmQueryObject<T>(entityClass, tableName, tableAlias);
  }
}

/**
 * Query Object演示类
 */
export class QueryObjectExample {
  private dataSource: DataSource;

  constructor(dataSource: DataSource) {
    this.dataSource = dataSource;
  }

  /**
   * 演示Query Object的使用
   */
  public async demonstrateQueryObject(): Promise<void> {
    console.log("=== Query Object 模式演示 ===");

    try {
      // 1. 基本查询
      console.log("\n1. 基本查询:");
      await this.demonstrateBasicQueries();

      // 2. 复杂查询
      console.log("\n2. 复杂查询:");
      await this.demonstrateComplexQueries();

      // 3. 动态查询
      console.log("\n3. 动态查询:");
      await this.demonstrateDynamicQueries();

      // 4. 查询组合
      console.log("\n4. 查询组合:");
      await this.demonstrateQueryComposition();

      // 5. 预定义查询
      console.log("\n5. 预定义查询:");
      await this.demonstratePredefinedQueries();

      this.printQueryObjectGuidelines();
    } catch (error) {
      console.error("Query Object演示失败:", error);
    }
  }

  private async demonstrateBasicQueries(): Promise<void> {
    // 简单的用户查询
    const userQuery = QueryFactory.createUserQuery()
      .byEmail("john@example.com")
      .select(["id", "username", "email"]);

    const { sql, parameters } = userQuery.buildQuery();
    console.log("✓ 用户查询SQL:", sql);
    console.log("✓ 查询参数:", parameters);

    // 产品查询
    const productQuery = QueryFactory.createProductQuery()
      .byCategory("电子")
      .inStock()
      .orderBy("price", SortDirection.ASC)
      .limit(10);

    const productResult = productQuery.buildQuery();
    console.log("✓ 产品查询SQL:", productResult.sql);
  }

  private async demonstrateComplexQueries(): Promise<void> {
    // 复杂的订单查询
    const orderQuery = QueryFactory.createOrderQuery()
      .withUser()
      .byStatus("pending")
      .highValue(1000)
      .select(["o.id", "o.total", "o.order_date", "u.username", "u.email"])
      .orderBy("o.order_date", SortDirection.DESC);

    const { sql, parameters } = orderQuery.buildQuery();
    console.log("✓ 复杂订单查询SQL:", sql);
    console.log("✓ 查询参数:", parameters);

    // 带分组的查询
    const salesQuery = QueryFactory.createSqlQuery("orders", "o")
      .select([
        "DATE(o.order_date) as order_date",
        "SUM(o.total) as daily_sales",
      ])
      .where({
        field: "o.status",
        operator: QueryOperator.EQUALS,
        value: "completed",
      })
      .groupBy(["DATE(o.order_date)"])
      .orderBy("order_date", SortDirection.DESC);

    const salesResult = salesQuery.buildQuery();
    console.log("✓ 销售统计查询SQL:", salesResult.sql);
  }

  private async demonstrateDynamicQueries(): Promise<void> {
    // 动态构建查询
    const dynamicQuery = QueryFactory.createProductQuery();

    // 根据条件动态添加查询条件
    const searchCriteria = {
      category: "电子",
      minPrice: 100,
      maxPrice: 1000,
      inStock: true,
      keyword: "手机",
    };

    if (searchCriteria.category) {
      dynamicQuery.byCategory(searchCriteria.category);
    }

    if (
      searchCriteria.minPrice !== undefined &&
      searchCriteria.maxPrice !== undefined
    ) {
      dynamicQuery.priceRange(searchCriteria.minPrice, searchCriteria.maxPrice);
    }

    if (searchCriteria.inStock) {
      dynamicQuery.inStock();
    }

    if (searchCriteria.keyword) {
      dynamicQuery.nameLike(searchCriteria.keyword);
    }

    const { sql, parameters } = dynamicQuery.buildQuery();
    console.log("✓ 动态查询SQL:", sql);
    console.log("✓ 查询参数:", parameters);
  }

  private async demonstrateQueryComposition(): Promise<void> {
    // 查询组合 - 活跃VIP用户
    const vipQuery = QueryFactory.createUserQuery()
      .activeVipUsers()
      .orderBy("created_at", SortDirection.DESC)
      .limit(20);

    const { sql, parameters } = vipQuery.buildQuery();
    console.log("✓ VIP用户查询SQL:", sql);

    // 查询组合 - 可用且有库存的产品
    const availableProductQuery = QueryFactory.createProductQuery()
      .availableAndInStock()
      .orderBy("sold_count", SortDirection.DESC);

    const availableResult = availableProductQuery.buildQuery();
    console.log("✓ 可用产品查询SQL:", availableResult.sql);

    // 复杂的逻辑组合
    const complexQuery = QueryFactory.createUserQuery()
      .whereOr([
        { field: "user_type", operator: QueryOperator.EQUALS, value: "VIP" },
        {
          field: "total_orders",
          operator: QueryOperator.GREATER_THAN,
          value: 10,
        },
      ])
      .whereAnd([
        { field: "is_active", operator: QueryOperator.EQUALS, value: true },
        {
          field: "created_at",
          operator: QueryOperator.GREATER_THAN,
          value: new Date("2023-01-01"),
        },
      ]);

    const complexResult = complexQuery.buildQuery();
    console.log("✓ 复杂逻辑查询SQL:", complexResult.sql);
  }

  private async demonstratePredefinedQueries(): Promise<void> {
    // 预定义的常用查询
    const todayOrders = QueryFactory.createOrderQuery()
      .today()
      .withUser()
      .select(["o.*", "u.username"]);

    const { sql, parameters } = todayOrders.buildQuery();
    console.log("✓ 今日订单查询SQL:", sql);

    // 畅销产品查询
    const bestsellers = QueryFactory.createProductQuery()
      .bestsellers(5)
      .availableAndInStock();

    const bestsellerResult = bestsellers.buildQuery();
    console.log("✓ 畅销产品查询SQL:", bestsellerResult.sql);

    // 低库存产品查询
    const lowStock = QueryFactory.createProductQuery()
      .lowStock(5)
      .orderBy("stock", SortDirection.ASC);

    const lowStockResult = lowStock.buildQuery();
    console.log("✓ 低库存产品查询SQL:", lowStockResult.sql);
  }

  private printQueryObjectGuidelines(): void {
    console.log(`
Query Object模式使用指南：

设计原则：
- 封装查询逻辑
- 支持查询组合
- 类型安全的查询构建
- 可测试的查询逻辑
- 支持动态查询构建

核心特征：
- 对象化的查询表示
- 流畅的查询构建接口
- 查询逻辑的重用性
- 查询的可测试性

适用场景：
- 复杂的查询逻辑
- 需要动态构建查询
- 查询需要复用
- 需要类型安全的查询
- 查询逻辑需要测试

最佳实践：
- 为常用查询创建专门的Query Object
- 使用流畅接口提高可读性
- 支持查询条件的组合
- 提供预定义的查询方法
- 考虑查询性能优化

与其他模式的关系：
- 与Repository配合使用
- 与Specification模式互补
- 可以集成到Data Mapper中
- 为Service Layer提供查询支持

注意事项：
- 避免过度复杂的查询对象
- 考虑SQL注入防护
- 注意查询性能
- 合理使用缓存
- 保持API的一致性

查询类型：
- 基本查询：简单的CRUD操作
- 复杂查询：多表连接、子查询
- 动态查询：根据条件构建
- 统计查询：聚合函数、分组
- 分页查询：大数据量处理
    `);
  }
}
