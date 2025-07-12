/**
 * Repository（仓储）模式
 *
 * 在领域层和数据映射层之间提供一个类似集合的接口来访问领域对象。
 * Repository封装了获取对象所需的逻辑，集中化常见的数据访问功能，
 * 提供更好的可维护性，并将基础设施或用于访问数据库的技术与领域模型解耦。
 *
 * 主要特点：
 * - 类似集合的接口
 * - 封装查询逻辑
 * - 提供类型安全的访问
 * - 支持规约模式
 * - 分离关注点
 *
 * 优点：
 * - 提供统一的数据访问接口
 * - 易于测试（可以Mock）
 * - 集中化查询逻辑
 * - 支持多数据源
 * - 提高代码复用性
 *
 * 缺点：
 * - 可能增加复杂性
 * - 需要额外的抽象层
 * - 可能出现"N+1"查询问题
 *
 * 适用场景：
 * - 复杂的查询逻辑
 * - 多数据源访问
 * - 需要测试的场景
 * - 领域驱动设计
 */

import { DataSource, Repository as TypeORMRepository } from "typeorm";
import { DomainObject } from "../base/layer-supertype";

/**
 * Repository异常
 */
export class RepositoryException extends Error {
  constructor(message: string, public readonly cause?: Error) {
    super(message);
    this.name = "RepositoryException";
  }
}

/**
 * 查询规约接口
 */
export interface Specification<T> {
  /**
   * 检查对象是否满足规约
   */
  isSatisfiedBy(obj: T): boolean;

  /**
   * 与操作
   */
  and(spec: Specification<T>): Specification<T>;

  /**
   * 或操作
   */
  or(spec: Specification<T>): Specification<T>;

  /**
   * 非操作
   */
  not(): Specification<T>;

  /**
   * 转换为SQL查询条件
   */
  toSqlWhereClause(): string;

  /**
   * 获取查询参数
   */
  getParameters(): any[];
}

/**
 * 抽象规约基类
 */
export abstract class AbstractSpecification<T> implements Specification<T> {
  abstract isSatisfiedBy(obj: T): boolean;
  abstract toSqlWhereClause(): string;
  abstract getParameters(): any[];

  and(spec: Specification<T>): Specification<T> {
    return new AndSpecification(this, spec);
  }

  or(spec: Specification<T>): Specification<T> {
    return new OrSpecification(this, spec);
  }

  not(): Specification<T> {
    return new NotSpecification(this);
  }
}

/**
 * 与规约
 */
class AndSpecification<T> extends AbstractSpecification<T> {
  constructor(private left: Specification<T>, private right: Specification<T>) {
    super();
  }

  isSatisfiedBy(obj: T): boolean {
    return this.left.isSatisfiedBy(obj) && this.right.isSatisfiedBy(obj);
  }

  toSqlWhereClause(): string {
    return `(${this.left.toSqlWhereClause()}) AND (${this.right.toSqlWhereClause()})`;
  }

  getParameters(): any[] {
    return [...this.left.getParameters(), ...this.right.getParameters()];
  }
}

/**
 * 或规约
 */
class OrSpecification<T> extends AbstractSpecification<T> {
  constructor(private left: Specification<T>, private right: Specification<T>) {
    super();
  }

  isSatisfiedBy(obj: T): boolean {
    return this.left.isSatisfiedBy(obj) || this.right.isSatisfiedBy(obj);
  }

  toSqlWhereClause(): string {
    return `(${this.left.toSqlWhereClause()}) OR (${this.right.toSqlWhereClause()})`;
  }

  getParameters(): any[] {
    return [...this.left.getParameters(), ...this.right.getParameters()];
  }
}

/**
 * 非规约
 */
class NotSpecification<T> extends AbstractSpecification<T> {
  constructor(private spec: Specification<T>) {
    super();
  }

  isSatisfiedBy(obj: T): boolean {
    return !this.spec.isSatisfiedBy(obj);
  }

  toSqlWhereClause(): string {
    return `NOT (${this.spec.toSqlWhereClause()})`;
  }

  getParameters(): any[] {
    return this.spec.getParameters();
  }
}

/**
 * 分页参数
 */
export interface PaginationOptions {
  page: number;
  pageSize: number;
  sortBy?: string;
  sortOrder?: "ASC" | "DESC";
}

/**
 * 分页结果
 */
export interface PaginatedResult<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

/**
 * 抽象Repository接口
 */
export interface Repository<T extends DomainObject, ID> {
  /**
   * 根据ID查找实体
   */
  findById(id: ID): Promise<T | null>;

  /**
   * 查找所有实体
   */
  findAll(): Promise<T[]>;

  /**
   * 根据规约查找实体
   */
  findBySpecification(spec: Specification<T>): Promise<T[]>;

  /**
   * 根据规约查找单个实体
   */
  findOneBySpecification(spec: Specification<T>): Promise<T | null>;

  /**
   * 分页查询
   */
  findPaginated(
    options: PaginationOptions,
    spec?: Specification<T>
  ): Promise<PaginatedResult<T>>;

  /**
   * 保存实体
   */
  save(entity: T): Promise<T>;

  /**
   * 批量保存
   */
  saveAll(entities: T[]): Promise<T[]>;

  /**
   * 删除实体
   */
  remove(entity: T): Promise<void>;

  /**
   * 根据ID删除
   */
  removeById(id: ID): Promise<void>;

  /**
   * 检查实体是否存在
   */
  exists(id: ID): Promise<boolean>;

  /**
   * 计算实体数量
   */
  count(spec?: Specification<T>): Promise<number>;

  /**
   * 清空所有实体
   */
  clear(): Promise<void>;
}

/**
 * 抽象Repository基类
 */
export abstract class AbstractRepository<T extends DomainObject, ID>
  implements Repository<T, ID>
{
  protected dataSource: DataSource;
  protected entityClass: new () => T;
  protected repository: TypeORMRepository<T>;

  constructor(dataSource: DataSource, entityClass: new () => T) {
    this.dataSource = dataSource;
    this.entityClass = entityClass;
    this.repository = dataSource.getRepository(entityClass);
  }

  async findById(id: ID): Promise<T | null> {
    try {
      const entity = await this.repository.findOne({ where: { id } as any });
      return entity || null;
    } catch (error) {
      throw new RepositoryException(
        `Failed to find entity by id: ${id}`,
        error as Error
      );
    }
  }

  async findAll(): Promise<T[]> {
    try {
      return await this.repository.find();
    } catch (error) {
      throw new RepositoryException(
        "Failed to find all entities",
        error as Error
      );
    }
  }

  async findBySpecification(spec: Specification<T>): Promise<T[]> {
    try {
      const queryBuilder = this.repository.createQueryBuilder("entity");
      queryBuilder.where(spec.toSqlWhereClause(), spec.getParameters());
      return await queryBuilder.getMany();
    } catch (error) {
      throw new RepositoryException(
        "Failed to find entities by specification",
        error as Error
      );
    }
  }

  async findOneBySpecification(spec: Specification<T>): Promise<T | null> {
    try {
      const queryBuilder = this.repository.createQueryBuilder("entity");
      queryBuilder.where(spec.toSqlWhereClause(), spec.getParameters());
      const entity = await queryBuilder.getOne();
      return entity || null;
    } catch (error) {
      throw new RepositoryException(
        "Failed to find one entity by specification",
        error as Error
      );
    }
  }

  async findPaginated(
    options: PaginationOptions,
    spec?: Specification<T>
  ): Promise<PaginatedResult<T>> {
    try {
      const queryBuilder = this.repository.createQueryBuilder("entity");

      if (spec) {
        queryBuilder.where(spec.toSqlWhereClause(), spec.getParameters());
      }

      if (options.sortBy) {
        queryBuilder.orderBy(
          `entity.${options.sortBy}`,
          options.sortOrder || "ASC"
        );
      }

      const offset = (options.page - 1) * options.pageSize;
      queryBuilder.skip(offset).take(options.pageSize);

      const [items, totalCount] = await queryBuilder.getManyAndCount();
      const totalPages = Math.ceil(totalCount / options.pageSize);

      return {
        items,
        totalCount,
        page: options.page,
        pageSize: options.pageSize,
        totalPages,
        hasNext: options.page < totalPages,
        hasPrevious: options.page > 1,
      };
    } catch (error) {
      throw new RepositoryException(
        "Failed to find paginated entities",
        error as Error
      );
    }
  }

  async save(entity: T): Promise<T> {
    try {
      return await this.repository.save(entity);
    } catch (error) {
      throw new RepositoryException("Failed to save entity", error as Error);
    }
  }

  async saveAll(entities: T[]): Promise<T[]> {
    try {
      return await this.repository.save(entities);
    } catch (error) {
      throw new RepositoryException("Failed to save entities", error as Error);
    }
  }

  async remove(entity: T): Promise<void> {
    try {
      await this.repository.remove(entity);
    } catch (error) {
      throw new RepositoryException("Failed to remove entity", error as Error);
    }
  }

  async removeById(id: ID): Promise<void> {
    try {
      await this.repository.delete(id as any);
    } catch (error) {
      throw new RepositoryException(
        `Failed to remove entity by id: ${id}`,
        error as Error
      );
    }
  }

  async exists(id: ID): Promise<boolean> {
    try {
      const count = await this.repository.count({ where: { id } as any });
      return count > 0;
    } catch (error) {
      throw new RepositoryException(
        `Failed to check entity existence: ${id}`,
        error as Error
      );
    }
  }

  async count(spec?: Specification<T>): Promise<number> {
    try {
      const queryBuilder = this.repository.createQueryBuilder("entity");

      if (spec) {
        queryBuilder.where(spec.toSqlWhereClause(), spec.getParameters());
      }

      return await queryBuilder.getCount();
    } catch (error) {
      throw new RepositoryException("Failed to count entities", error as Error);
    }
  }

  async clear(): Promise<void> {
    try {
      await this.repository.clear();
    } catch (error) {
      throw new RepositoryException("Failed to clear entities", error as Error);
    }
  }
}

/**
 * 用户领域对象
 */
export class User extends DomainObject {
  private username: string;
  private email: string;
  private password: string;
  private isActive: boolean;
  private registeredAt: Date;

  constructor(username: string, email: string, password: string) {
    super();
    this.username = username;
    this.email = email;
    this.password = password;
    this.isActive = true;
    this.registeredAt = new Date();
  }

  // Getters
  public getUsername(): string {
    return this.username;
  }

  public getEmail(): string {
    return this.email;
  }

  public getPassword(): string {
    return this.password;
  }

  public getIsActive(): boolean {
    return this.isActive;
  }

  public getRegisteredAt(): Date {
    return this.registeredAt;
  }

  // Business methods
  public changePassword(newPassword: string): void {
    this.password = newPassword;
    this.markUpdated();
  }

  public activate(): void {
    this.isActive = true;
    this.markUpdated();
  }

  public deactivate(): void {
    this.isActive = false;
    this.markUpdated();
  }

  public clone(): User {
    const cloned = new User(this.username, this.email, this.password);
    cloned.isActive = this.isActive;
    cloned.registeredAt = this.registeredAt;
    return cloned;
  }

  public isValid(): boolean {
    return (
      this.username.length >= 3 &&
      this.email.includes("@") &&
      this.password.length >= 6
    );
  }
}

/**
 * 用户规约
 */
export class UserByEmailSpecification extends AbstractSpecification<User> {
  constructor(private email: string) {
    super();
  }

  isSatisfiedBy(user: User): boolean {
    return user.getEmail() === this.email;
  }

  toSqlWhereClause(): string {
    return "entity.email = ?";
  }

  getParameters(): any[] {
    return [this.email];
  }
}

export class UserByUsernameSpecification extends AbstractSpecification<User> {
  constructor(private username: string) {
    super();
  }

  isSatisfiedBy(user: User): boolean {
    return user.getUsername() === this.username;
  }

  toSqlWhereClause(): string {
    return "entity.username = ?";
  }

  getParameters(): any[] {
    return [this.username];
  }
}

export class ActiveUserSpecification extends AbstractSpecification<User> {
  isSatisfiedBy(user: User): boolean {
    return user.getIsActive();
  }

  toSqlWhereClause(): string {
    return "entity.isActive = ?";
  }

  getParameters(): any[] {
    return [true];
  }
}

export class UserRegisteredAfterSpecification extends AbstractSpecification<User> {
  constructor(private date: Date) {
    super();
  }

  isSatisfiedBy(user: User): boolean {
    return user.getRegisteredAt() > this.date;
  }

  toSqlWhereClause(): string {
    return "entity.registeredAt > ?";
  }

  getParameters(): any[] {
    return [this.date];
  }
}

/**
 * 用户Repository接口
 */
export interface UserRepository extends Repository<User, string> {
  /**
   * 根据邮箱查找用户
   */
  findByEmail(email: string): Promise<User | null>;

  /**
   * 根据用户名查找用户
   */
  findByUsername(username: string): Promise<User | null>;

  /**
   * 查找活跃用户
   */
  findActiveUsers(): Promise<User[]>;

  /**
   * 查找指定日期后注册的用户
   */
  findUsersRegisteredAfter(date: Date): Promise<User[]>;

  /**
   * 根据邮箱模糊查找用户
   */
  findByEmailPattern(pattern: string): Promise<User[]>;
}

/**
 * 用户Repository实现
 */
export class UserRepositoryImpl
  extends AbstractRepository<User, string>
  implements UserRepository
{
  constructor(dataSource: DataSource) {
    super(dataSource, User);
  }

  async findByEmail(email: string): Promise<User | null> {
    const spec = new UserByEmailSpecification(email);
    return await this.findOneBySpecification(spec);
  }

  async findByUsername(username: string): Promise<User | null> {
    const spec = new UserByUsernameSpecification(username);
    return await this.findOneBySpecification(spec);
  }

  async findActiveUsers(): Promise<User[]> {
    const spec = new ActiveUserSpecification();
    return await this.findBySpecification(spec);
  }

  async findUsersRegisteredAfter(date: Date): Promise<User[]> {
    const spec = new UserRegisteredAfterSpecification(date);
    return await this.findBySpecification(spec);
  }

  async findByEmailPattern(pattern: string): Promise<User[]> {
    try {
      const queryBuilder = this.repository.createQueryBuilder("entity");
      queryBuilder.where("entity.email LIKE ?", [`%${pattern}%`]);
      return await queryBuilder.getMany();
    } catch (error) {
      throw new RepositoryException(
        "Failed to find users by email pattern",
        error as Error
      );
    }
  }

  /**
   * 查找活跃且最近注册的用户
   */
  async findActiveUsersRegisteredAfter(date: Date): Promise<User[]> {
    const activeSpec = new ActiveUserSpecification();
    const recentSpec = new UserRegisteredAfterSpecification(date);
    const combinedSpec = activeSpec.and(recentSpec);
    return await this.findBySpecification(combinedSpec);
  }
}

/**
 * 产品领域对象
 */
export class Product extends DomainObject {
  private name: string;
  private price: number;
  private description: string;
  private category: string;
  private stock: number;
  private isAvailable: boolean;

  constructor(
    name: string,
    price: number,
    description: string,
    category: string,
    stock: number
  ) {
    super();
    this.name = name;
    this.price = price;
    this.description = description;
    this.category = category;
    this.stock = stock;
    this.isAvailable = true;
  }

  // Getters
  public getName(): string {
    return this.name;
  }

  public getPrice(): number {
    return this.price;
  }

  public getDescription(): string {
    return this.description;
  }

  public getCategory(): string {
    return this.category;
  }

  public getStock(): number {
    return this.stock;
  }

  public getIsAvailable(): boolean {
    return this.isAvailable;
  }

  // Business methods
  public updatePrice(newPrice: number): void {
    if (newPrice < 0) {
      throw new Error("Price cannot be negative");
    }
    this.price = newPrice;
    this.markUpdated();
  }

  public updateStock(newStock: number): void {
    if (newStock < 0) {
      throw new Error("Stock cannot be negative");
    }
    this.stock = newStock;
    this.markUpdated();
  }

  public setAvailable(available: boolean): void {
    this.isAvailable = available;
    this.markUpdated();
  }

  public isInStock(): boolean {
    return this.stock > 0;
  }

  public clone(): Product {
    const cloned = new Product(
      this.name,
      this.price,
      this.description,
      this.category,
      this.stock
    );
    cloned.isAvailable = this.isAvailable;
    return cloned;
  }

  public isValid(): boolean {
    return this.name.length > 0 && this.price >= 0 && this.stock >= 0;
  }
}

/**
 * 产品规约
 */
export class ProductByCategorySpecification extends AbstractSpecification<Product> {
  constructor(private category: string) {
    super();
  }

  isSatisfiedBy(product: Product): boolean {
    return product.getCategory() === this.category;
  }

  toSqlWhereClause(): string {
    return "entity.category = ?";
  }

  getParameters(): any[] {
    return [this.category];
  }
}

export class ProductInStockSpecification extends AbstractSpecification<Product> {
  isSatisfiedBy(product: Product): boolean {
    return product.isInStock();
  }

  toSqlWhereClause(): string {
    return "entity.stock > 0";
  }

  getParameters(): any[] {
    return [];
  }
}

export class ProductPriceRangeSpecification extends AbstractSpecification<Product> {
  constructor(private minPrice: number, private maxPrice: number) {
    super();
  }

  isSatisfiedBy(product: Product): boolean {
    const price = product.getPrice();
    return price >= this.minPrice && price <= this.maxPrice;
  }

  toSqlWhereClause(): string {
    return "entity.price BETWEEN ? AND ?";
  }

  getParameters(): any[] {
    return [this.minPrice, this.maxPrice];
  }
}

/**
 * 产品Repository接口
 */
export interface ProductRepository extends Repository<Product, string> {
  /**
   * 根据类别查找产品
   */
  findByCategory(category: string): Promise<Product[]>;

  /**
   * 查找有库存的产品
   */
  findInStockProducts(): Promise<Product[]>;

  /**
   * 根据价格范围查找产品
   */
  findByPriceRange(minPrice: number, maxPrice: number): Promise<Product[]>;

  /**
   * 查找热销产品
   */
  findPopularProducts(limit: number): Promise<Product[]>;
}

/**
 * 产品Repository实现
 */
export class ProductRepositoryImpl
  extends AbstractRepository<Product, string>
  implements ProductRepository
{
  constructor(dataSource: DataSource) {
    super(dataSource, Product);
  }

  async findByCategory(category: string): Promise<Product[]> {
    const spec = new ProductByCategorySpecification(category);
    return await this.findBySpecification(spec);
  }

  async findInStockProducts(): Promise<Product[]> {
    const spec = new ProductInStockSpecification();
    return await this.findBySpecification(spec);
  }

  async findByPriceRange(
    minPrice: number,
    maxPrice: number
  ): Promise<Product[]> {
    const spec = new ProductPriceRangeSpecification(minPrice, maxPrice);
    return await this.findBySpecification(spec);
  }

  async findPopularProducts(limit: number): Promise<Product[]> {
    try {
      const queryBuilder = this.repository.createQueryBuilder("entity");
      queryBuilder.orderBy("entity.soldCount", "DESC");
      queryBuilder.limit(limit);
      return await queryBuilder.getMany();
    } catch (error) {
      throw new RepositoryException(
        "Failed to find popular products",
        error as Error
      );
    }
  }

  /**
   * 查找指定类别的有库存产品
   */
  async findInStockProductsByCategory(category: string): Promise<Product[]> {
    const categorySpec = new ProductByCategorySpecification(category);
    const stockSpec = new ProductInStockSpecification();
    const combinedSpec = categorySpec.and(stockSpec);
    return await this.findBySpecification(combinedSpec);
  }
}

/**
 * Repository工厂
 */
export class RepositoryFactory {
  private dataSource: DataSource;

  constructor(dataSource: DataSource) {
    this.dataSource = dataSource;
  }

  createUserRepository(): UserRepository {
    return new UserRepositoryImpl(this.dataSource);
  }

  createProductRepository(): ProductRepository {
    return new ProductRepositoryImpl(this.dataSource);
  }
}

/**
 * Repository演示类
 */
export class RepositoryExample {
  private repositoryFactory: RepositoryFactory;
  private userRepository: UserRepository;
  private productRepository: ProductRepository;

  constructor(dataSource: DataSource) {
    this.repositoryFactory = new RepositoryFactory(dataSource);
    this.userRepository = this.repositoryFactory.createUserRepository();
    this.productRepository = this.repositoryFactory.createProductRepository();
  }

  /**
   * 演示Repository模式的使用
   */
  async demonstrateRepository(): Promise<void> {
    console.log("=== Repository 模式演示 ===");

    try {
      // 1. 基本CRUD操作
      console.log("\n1. 基本CRUD操作:");
      await this.demonstrateBasicCRUD();

      // 2. 规约模式
      console.log("\n2. 规约模式演示:");
      await this.demonstrateSpecifications();

      // 3. 分页查询
      console.log("\n3. 分页查询:");
      await this.demonstratePagination();

      // 4. 复杂查询
      console.log("\n4. 复杂查询:");
      await this.demonstrateComplexQueries();

      // 5. 批量操作
      console.log("\n5. 批量操作:");
      await this.demonstrateBatchOperations();

      this.printRepositoryGuidelines();
    } catch (error) {
      console.error("Repository演示失败:", error);
    }
  }

  private async demonstrateBasicCRUD(): Promise<void> {
    // 创建用户
    const user = new User("john_doe", "john@example.com", "password123");
    const savedUser = await this.userRepository.save(user);
    console.log("✓ 用户创建成功:", savedUser.getUsername());

    // 查找用户
    const foundUser = await this.userRepository.findById(savedUser.getId());
    if (foundUser) {
      console.log("✓ 查找用户成功:", foundUser.getUsername());
    }

    // 更新用户
    foundUser?.changePassword("newpassword123");
    if (foundUser) {
      await this.userRepository.save(foundUser);
      console.log("✓ 用户更新成功");
    }

    // 检查存在性
    const exists = await this.userRepository.exists(savedUser.getId());
    console.log("✓ 用户存在性检查:", exists);
  }

  private async demonstrateSpecifications(): Promise<void> {
    // 创建测试数据
    const user1 = new User("active_user", "active@example.com", "password123");
    const user2 = new User(
      "inactive_user",
      "inactive@example.com",
      "password123"
    );
    user2.deactivate();

    await this.userRepository.save(user1);
    await this.userRepository.save(user2);

    // 使用规约查询
    const activeUsers = await this.userRepository.findActiveUsers();
    console.log("✓ 活跃用户数量:", activeUsers.length);

    // 根据邮箱查询
    const userByEmail = await this.userRepository.findByEmail(
      "active@example.com"
    );
    if (userByEmail) {
      console.log("✓ 根据邮箱查找用户:", userByEmail.getUsername());
    }

    // 复合规约
    const recentDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24小时前
    const recentActiveUsers = await (
      this.userRepository as UserRepositoryImpl
    ).findActiveUsersRegisteredAfter(recentDate);
    console.log("✓ 最近活跃用户数量:", recentActiveUsers.length);
  }

  private async demonstratePagination(): Promise<void> {
    // 创建测试产品
    const products = [];
    for (let i = 1; i <= 25; i++) {
      const product = new Product(
        `产品${i}`,
        i * 10,
        `产品${i}的描述`,
        i % 3 === 0 ? "电子" : "服装",
        i * 5
      );
      products.push(product);
    }
    await this.productRepository.saveAll(products);

    // 分页查询
    const paginationOptions: PaginationOptions = {
      page: 1,
      pageSize: 10,
      sortBy: "price",
      sortOrder: "ASC",
    };

    const paginatedResult = await this.productRepository.findPaginated(
      paginationOptions
    );
    console.log("✓ 分页查询结果:");
    console.log("  - 总数:", paginatedResult.totalCount);
    console.log("  - 当前页:", paginatedResult.page);
    console.log("  - 每页数量:", paginatedResult.pageSize);
    console.log("  - 总页数:", paginatedResult.totalPages);
    console.log("  - 是否有下一页:", paginatedResult.hasNext);
    console.log("  - 当前页商品数:", paginatedResult.items.length);
  }

  private async demonstrateComplexQueries(): Promise<void> {
    // 根据类别查询产品
    const electronicsProducts = await this.productRepository.findByCategory(
      "电子"
    );
    console.log("✓ 电子产品数量:", electronicsProducts.length);

    // 根据价格范围查询
    const affordableProducts = await this.productRepository.findByPriceRange(
      50,
      200
    );
    console.log("✓ 价格在50-200之间的产品数量:", affordableProducts.length);

    // 查找有库存的产品
    const inStockProducts = await this.productRepository.findInStockProducts();
    console.log("✓ 有库存的产品数量:", inStockProducts.length);

    // 复合查询：特定类别的有库存产品
    const inStockElectronics = await (
      this.productRepository as ProductRepositoryImpl
    ).findInStockProductsByCategory("电子");
    console.log("✓ 有库存的电子产品数量:", inStockElectronics.length);
  }

  private async demonstrateBatchOperations(): Promise<void> {
    // 批量创建产品
    const batchProducts = [
      new Product("批量产品1", 100, "批量产品1描述", "批量", 10),
      new Product("批量产品2", 200, "批量产品2描述", "批量", 20),
      new Product("批量产品3", 300, "批量产品3描述", "批量", 30),
    ];

    const savedProducts = await this.productRepository.saveAll(batchProducts);
    console.log("✓ 批量保存产品数量:", savedProducts.length);

    // 统计数量
    const totalCount = await this.productRepository.count();
    console.log("✓ 产品总数量:", totalCount);

    // 根据规约统计
    const categorySpec = new ProductByCategorySpecification("批量");
    const batchCount = await this.productRepository.count(categorySpec);
    console.log("✓ 批量类别产品数量:", batchCount);
  }

  private printRepositoryGuidelines(): void {
    console.log(`
Repository模式使用指南：

设计原则：
- 类似集合的接口
- 封装查询逻辑
- 提供类型安全的访问
- 支持规约模式
- 分离关注点

核心特征：
- 统一的数据访问接口
- 领域对象的集合抽象
- 查询逻辑的封装
- 支持复杂查询组合

规约模式(Specification Pattern)：
- 封装查询条件
- 支持组合查询
- 提高代码复用性
- 便于测试和维护

适用场景：
- 复杂的查询逻辑
- 多数据源访问
- 需要测试的场景
- 领域驱动设计
- 需要查询复用的场景

最佳实践：
- 为每个聚合根创建Repository
- 使用规约模式封装查询条件
- 提供粗粒度的查询方法
- 考虑性能和N+1问题
- 保持Repository接口的稳定性

与其他模式的关系：
- 与Unit of Work配合管理事务
- 与Domain Model提供数据访问
- 与Specification封装查询条件
- 为Service Layer提供数据服务

注意事项：
- 避免Repository过于复杂
- 合理使用缓存机制
- 考虑查询性能优化
- 处理好异常情况
- 保持接口的一致性
    `);
  }
}
