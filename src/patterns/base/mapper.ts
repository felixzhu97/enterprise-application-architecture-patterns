/**
 * Mapper（映射器）模式
 *
 * 在不同表示形式的对象之间建立映射关系。
 * 这个模式用于在层之间转换数据格式，保持各层的独立性。
 *
 * 优点：
 * - 分离不同层的数据表示
 * - 提供灵活的数据转换
 * - 便于维护和测试
 * - 支持复杂的映射逻辑
 *
 * 使用场景：
 * - 领域对象与数据库记录转换
 * - 领域对象与DTO转换
 * - API请求响应转换
 * - 不同系统间数据格式转换
 */

/**
 * 抽象映射器基类
 */
export abstract class Mapper<TSource, TTarget> {
  /**
   * 将源对象映射为目标对象
   */
  abstract map(source: TSource): TTarget;

  /**
   * 批量映射
   */
  mapArray(sources: TSource[]): TTarget[] {
    return sources.map((source) => this.map(source));
  }

  /**
   * 反向映射（如果支持）
   */
  abstract reverseMap(target: TTarget): TSource;

  /**
   * 批量反向映射
   */
  reverseMapArray(targets: TTarget[]): TSource[] {
    return targets.map((target) => this.reverseMap(target));
  }
}

/**
 * 双向映射器
 */
export abstract class BidirectionalMapper<TLeft, TRight> {
  abstract mapToRight(left: TLeft): TRight;
  abstract mapToLeft(right: TRight): TLeft;

  mapArrayToRight(lefts: TLeft[]): TRight[] {
    return lefts.map((left) => this.mapToRight(left));
  }

  mapArrayToLeft(rights: TRight[]): TLeft[] {
    return rights.map((right) => this.mapToLeft(right));
  }
}

// ============================================================================
// 领域对象定义
// ============================================================================

/**
 * 用户领域对象
 */
export class User {
  constructor(
    public readonly id: string,
    public readonly username: string,
    public readonly email: string,
    public readonly passwordHash: string,
    public readonly profile: UserProfile,
    public readonly status: UserStatus,
    public readonly createdAt: Date,
    public readonly updatedAt: Date
  ) {}

  isActive(): boolean {
    return this.status === UserStatus.ACTIVE;
  }

  updateProfile(profile: UserProfile): User {
    return new User(
      this.id,
      this.username,
      this.email,
      this.passwordHash,
      profile,
      this.status,
      this.createdAt,
      new Date()
    );
  }
}

export class UserProfile {
  constructor(
    public readonly firstName: string,
    public readonly lastName: string,
    public readonly phone?: string,
    public readonly avatar?: string
  ) {}

  getFullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }
}

export enum UserStatus {
  ACTIVE = "active",
  INACTIVE = "inactive",
  SUSPENDED = "suspended",
}

/**
 * 产品领域对象
 */
export class Product {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly description: string,
    public readonly price: Money,
    public readonly categoryId: string,
    public readonly inventory: ProductInventory,
    public readonly metadata: ProductMetadata,
    public readonly createdAt: Date,
    public readonly updatedAt: Date
  ) {}

  isAvailable(): boolean {
    return this.inventory.quantity > 0;
  }

  canReserve(quantity: number): boolean {
    return this.inventory.quantity >= quantity;
  }
}

export class Money {
  constructor(
    public readonly amount: number,
    public readonly currency: string
  ) {
    if (amount < 0) {
      throw new Error("金额不能为负数");
    }
  }

  add(other: Money): Money {
    if (this.currency !== other.currency) {
      throw new Error("不能相加不同货币");
    }
    return new Money(this.amount + other.amount, this.currency);
  }

  multiply(factor: number): Money {
    return new Money(this.amount * factor, this.currency);
  }

  equals(other: Money): boolean {
    return this.amount === other.amount && this.currency === other.currency;
  }

  toString(): string {
    return `${this.amount} ${this.currency}`;
  }
}

export class ProductInventory {
  constructor(
    public readonly quantity: number,
    public readonly reserved: number = 0
  ) {}

  getAvailable(): number {
    return Math.max(0, this.quantity - this.reserved);
  }

  reserve(quantity: number): ProductInventory {
    if (this.getAvailable() < quantity) {
      throw new Error("库存不足");
    }
    return new ProductInventory(this.quantity, this.reserved + quantity);
  }

  release(quantity: number): ProductInventory {
    const newReserved = Math.max(0, this.reserved - quantity);
    return new ProductInventory(this.quantity, newReserved);
  }
}

export class ProductMetadata {
  constructor(
    public readonly sku: string,
    public readonly weight?: number,
    public readonly dimensions?: Dimensions,
    public readonly tags: string[] = []
  ) {}
}

export class Dimensions {
  constructor(
    public readonly length: number,
    public readonly width: number,
    public readonly height: number,
    public readonly unit: string = "cm"
  ) {}

  getVolume(): number {
    return this.length * this.width * this.height;
  }
}

// ============================================================================
// 数据传输对象 (DTO)
// ============================================================================

export interface UserDTO {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  avatar?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserDTO {
  username: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
}

export interface UpdateUserDTO {
  firstName?: string;
  lastName?: string;
  phone?: string;
  avatar?: string;
}

export interface ProductDTO {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  categoryId: string;
  stockQuantity: number;
  sku: string;
  weight?: number;
  dimensions?: {
    length: number;
    width: number;
    height: number;
    unit: string;
  };
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateProductDTO {
  name: string;
  description: string;
  price: number;
  currency: string;
  categoryId: string;
  stockQuantity: number;
  sku: string;
  weight?: number;
  dimensions?: {
    length: number;
    width: number;
    height: number;
    unit: string;
  };
  tags?: string[];
}

// ============================================================================
// 数据库记录对象
// ============================================================================

export interface UserRecord {
  id: string;
  username: string;
  email: string;
  password_hash: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  avatar: string | null;
  status: string;
  created_at: Date;
  updated_at: Date;
}

export interface ProductRecord {
  id: string;
  name: string;
  description: string;
  price_amount: number;
  price_currency: string;
  category_id: string;
  stock_quantity: number;
  reserved_quantity: number;
  sku: string;
  weight: number | null;
  length: number | null;
  width: number | null;
  height: number | null;
  dimension_unit: string | null;
  tags: string;
  created_at: Date;
  updated_at: Date;
}

// ============================================================================
// 具体映射器实现
// ============================================================================

/**
 * 用户映射器：领域对象 <-> DTO
 */
export class UserDTOMapper extends BidirectionalMapper<User, UserDTO> {
  mapToRight(user: User): UserDTO {
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      firstName: user.profile.firstName,
      lastName: user.profile.lastName,
      phone: user.profile.phone,
      avatar: user.profile.avatar,
      status: user.status,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }

  mapToLeft(dto: UserDTO): User {
    const profile = new UserProfile(
      dto.firstName,
      dto.lastName,
      dto.phone,
      dto.avatar
    );

    return new User(
      dto.id,
      dto.username,
      dto.email,
      "", // DTO中不包含密码哈希
      profile,
      dto.status as UserStatus,
      new Date(dto.createdAt),
      new Date(dto.updatedAt)
    );
  }
}

/**
 * 用户映射器：领域对象 <-> 数据库记录
 */
export class UserRecordMapper extends BidirectionalMapper<User, UserRecord> {
  mapToRight(user: User): UserRecord {
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      password_hash: user.passwordHash,
      first_name: user.profile.firstName,
      last_name: user.profile.lastName,
      phone: user.profile.phone || null,
      avatar: user.profile.avatar || null,
      status: user.status,
      created_at: user.createdAt,
      updated_at: user.updatedAt,
    };
  }

  mapToLeft(record: UserRecord): User {
    const profile = new UserProfile(
      record.first_name,
      record.last_name,
      record.phone || undefined,
      record.avatar || undefined
    );

    return new User(
      record.id,
      record.username,
      record.email,
      record.password_hash,
      profile,
      record.status as UserStatus,
      record.created_at,
      record.updated_at
    );
  }
}

/**
 * 产品映射器：领域对象 <-> DTO
 */
export class ProductDTOMapper extends BidirectionalMapper<Product, ProductDTO> {
  mapToRight(product: Product): ProductDTO {
    return {
      id: product.id,
      name: product.name,
      description: product.description,
      price: product.price.amount,
      currency: product.price.currency,
      categoryId: product.categoryId,
      stockQuantity: product.inventory.quantity,
      sku: product.metadata.sku,
      weight: product.metadata.weight,
      dimensions: product.metadata.dimensions
        ? {
            length: product.metadata.dimensions.length,
            width: product.metadata.dimensions.width,
            height: product.metadata.dimensions.height,
            unit: product.metadata.dimensions.unit,
          }
        : undefined,
      tags: product.metadata.tags,
      createdAt: product.createdAt.toISOString(),
      updatedAt: product.updatedAt.toISOString(),
    };
  }

  mapToLeft(dto: ProductDTO): Product {
    const price = new Money(dto.price, dto.currency);
    const inventory = new ProductInventory(dto.stockQuantity);

    const dimensions = dto.dimensions
      ? new Dimensions(
          dto.dimensions.length,
          dto.dimensions.width,
          dto.dimensions.height,
          dto.dimensions.unit
        )
      : undefined;

    const metadata = new ProductMetadata(
      dto.sku,
      dto.weight,
      dimensions,
      dto.tags
    );

    return new Product(
      dto.id,
      dto.name,
      dto.description,
      price,
      dto.categoryId,
      inventory,
      metadata,
      new Date(dto.createdAt),
      new Date(dto.updatedAt)
    );
  }
}

/**
 * 产品映射器：领域对象 <-> 数据库记录
 */
export class ProductRecordMapper extends BidirectionalMapper<
  Product,
  ProductRecord
> {
  mapToRight(product: Product): ProductRecord {
    return {
      id: product.id,
      name: product.name,
      description: product.description,
      price_amount: product.price.amount,
      price_currency: product.price.currency,
      category_id: product.categoryId,
      stock_quantity: product.inventory.quantity,
      reserved_quantity: product.inventory.reserved,
      sku: product.metadata.sku,
      weight: product.metadata.weight || null,
      length: product.metadata.dimensions?.length || null,
      width: product.metadata.dimensions?.width || null,
      height: product.metadata.dimensions?.height || null,
      dimension_unit: product.metadata.dimensions?.unit || null,
      tags: product.metadata.tags.join(","),
      created_at: product.createdAt,
      updated_at: product.updatedAt,
    };
  }

  mapToLeft(record: ProductRecord): Product {
    const price = new Money(record.price_amount, record.price_currency);
    const inventory = new ProductInventory(
      record.stock_quantity,
      record.reserved_quantity
    );

    const dimensions =
      record.length && record.width && record.height
        ? new Dimensions(
            record.length,
            record.width,
            record.height,
            record.dimension_unit || "cm"
          )
        : undefined;

    const metadata = new ProductMetadata(
      record.sku,
      record.weight || undefined,
      dimensions,
      record.tags
        ? record.tags.split(",").filter((tag) => tag.trim() !== "")
        : []
    );

    return new Product(
      record.id,
      record.name,
      record.description,
      price,
      record.category_id,
      inventory,
      metadata,
      record.created_at,
      record.updated_at
    );
  }
}

/**
 * 映射器工厂
 * 提供所有映射器的单例实例
 */
export class MapperFactory {
  private static userDTOMapper: UserDTOMapper;
  private static userRecordMapper: UserRecordMapper;
  private static productDTOMapper: ProductDTOMapper;
  private static productRecordMapper: ProductRecordMapper;

  static getUserDTOMapper(): UserDTOMapper {
    if (!this.userDTOMapper) {
      this.userDTOMapper = new UserDTOMapper();
    }
    return this.userDTOMapper;
  }

  static getUserRecordMapper(): UserRecordMapper {
    if (!this.userRecordMapper) {
      this.userRecordMapper = new UserRecordMapper();
    }
    return this.userRecordMapper;
  }

  static getProductDTOMapper(): ProductDTOMapper {
    if (!this.productDTOMapper) {
      this.productDTOMapper = new ProductDTOMapper();
    }
    return this.productDTOMapper;
  }

  static getProductRecordMapper(): ProductRecordMapper {
    if (!this.productRecordMapper) {
      this.productRecordMapper = new ProductRecordMapper();
    }
    return this.productRecordMapper;
  }
}
