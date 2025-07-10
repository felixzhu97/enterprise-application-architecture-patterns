/**
 * Separated Interface（分离接口）模式
 *
 * 在一个包中定义接口，而在另一个包中实现接口。
 * 这个模式通过分离接口定义和实现来降低包之间的耦合度。
 *
 * 优点：
 * - 降低包间耦合
 * - 提高代码的可测试性
 * - 支持依赖倒置原则
 * - 便于创建Mock对象
 *
 * 使用场景：
 * - 需要降低层间依赖时
 * - 创建可测试的架构时
 * - 实现插件式架构时
 */

/**
 * 仓储接口 - 定义在领域层
 * 接口与实现分离，实现在数据访问层
 */
export interface Repository<T, ID> {
  /**
   * 根据ID查找实体
   */
  findById(id: ID): Promise<T | null>;

  /**
   * 查找所有实体
   */
  findAll(): Promise<T[]>;

  /**
   * 保存实体
   */
  save(entity: T): Promise<T>;

  /**
   * 删除实体
   */
  delete(id: ID): Promise<void>;

  /**
   * 检查实体是否存在
   */
  exists(id: ID): Promise<boolean>;
}

/**
 * 用户仓储接口
 */
export interface UserRepository extends Repository<User, string> {
  findByEmail(email: string): Promise<User | null>;
  findByUsername(username: string): Promise<User | null>;
  findActiveUsers(): Promise<User[]>;
}

/**
 * 产品仓储接口
 */
export interface ProductRepository extends Repository<Product, string> {
  findByCategory(categoryId: string): Promise<Product[]>;
  findByPriceRange(minPrice: number, maxPrice: number): Promise<Product[]>;
  findInStock(): Promise<Product[]>;
  searchByName(name: string): Promise<Product[]>;
}

/**
 * 订单仓储接口
 */
export interface OrderRepository extends Repository<Order, string> {
  findByUserId(userId: string): Promise<Order[]>;
  findByStatus(status: OrderStatus): Promise<Order[]>;
  findByDateRange(startDate: Date, endDate: Date): Promise<Order[]>;
}

/**
 * 邮件服务接口 - 定义在应用层
 * 实现可能在基础设施层
 */
export interface EmailService {
  sendWelcomeEmail(to: string, username: string): Promise<void>;
  sendOrderConfirmation(to: string, orderDetails: OrderDetails): Promise<void>;
  sendPasswordReset(to: string, resetToken: string): Promise<void>;
  sendNotification(to: string, subject: string, content: string): Promise<void>;
}

/**
 * 支付处理器接口 - 定义在领域层
 * 实现在基础设施层（支付网关适配器）
 */
export interface PaymentProcessor {
  processPayment(payment: PaymentRequest): Promise<PaymentResult>;
  refundPayment(transactionId: string, amount: number): Promise<RefundResult>;
  getTransactionStatus(transactionId: string): Promise<TransactionStatus>;
}

/**
 * 库存管理接口 - 定义在领域层
 * 实现可能在外部服务适配器中
 */
export interface InventoryService {
  checkAvailability(productId: string, quantity: number): Promise<boolean>;
  reserveItems(productId: string, quantity: number): Promise<string>; // 返回预留ID
  releaseReservation(reservationId: string): Promise<void>;
  updateStock(productId: string, quantity: number): Promise<void>;
  getStockLevel(productId: string): Promise<number>;
}

/**
 * 缓存服务接口 - 定义在应用层
 * 实现在基础设施层
 */
export interface CacheService {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttl?: number): Promise<void>;
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
  clear(): Promise<void>;
}

/**
 * 日志服务接口 - 定义在应用层
 * 实现在基础设施层
 */
export interface Logger {
  info(message: string, meta?: any): void;
  warn(message: string, meta?: any): void;
  error(message: string, error?: Error, meta?: any): void;
  debug(message: string, meta?: any): void;
}

/**
 * 事件发布器接口 - 定义在领域层
 * 实现在基础设施层
 */
export interface EventPublisher {
  publish(event: DomainEvent): Promise<void>;
  publishBatch(events: DomainEvent[]): Promise<void>;
}

/**
 * 认证服务接口 - 定义在应用层
 * 实现在基础设施层
 */
export interface AuthenticationService {
  authenticate(credentials: LoginCredentials): Promise<AuthResult>;
  generateToken(user: User): Promise<string>;
  validateToken(token: string): Promise<User | null>;
  refreshToken(refreshToken: string): Promise<string>;
  logout(token: string): Promise<void>;
}

/**
 * 文件存储接口 - 定义在应用层
 * 实现在基础设施层（可能是本地存储、云存储等）
 */
export interface FileStorageService {
  uploadFile(file: FileData, path: string): Promise<string>; // 返回文件URL
  downloadFile(path: string): Promise<Buffer>;
  deleteFile(path: string): Promise<void>;
  getFileInfo(path: string): Promise<FileInfo>;
  generatePresignedUrl(path: string, expirationTime: number): Promise<string>;
}

// ============================================================================
// 数据传输对象和值对象定义
// ============================================================================

export interface User {
  id: string;
  username: string;
  email: string;
  createdAt: Date;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  categoryId: string;
  stockQuantity: number;
}

export interface Order {
  id: string;
  userId: string;
  status: OrderStatus;
  createdAt: Date;
  totalAmount: number;
}

export enum OrderStatus {
  PENDING = "pending",
  CONFIRMED = "confirmed",
  SHIPPED = "shipped",
  DELIVERED = "delivered",
  CANCELLED = "cancelled",
}

export interface OrderDetails {
  orderId: string;
  items: OrderItem[];
  totalAmount: number;
  shippingAddress: Address;
}

export interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
}

export interface Address {
  street: string;
  city: string;
  province: string;
  postalCode: string;
  country: string;
}

export interface PaymentRequest {
  amount: number;
  currency: string;
  paymentMethod: PaymentMethod;
  orderId: string;
}

export interface PaymentResult {
  success: boolean;
  transactionId: string;
  message?: string;
}

export interface RefundResult {
  success: boolean;
  refundId: string;
  message?: string;
}

export enum PaymentMethod {
  CREDIT_CARD = "credit_card",
  ALIPAY = "alipay",
  WECHAT_PAY = "wechat_pay",
  BANK_TRANSFER = "bank_transfer",
}

export enum TransactionStatus {
  PENDING = "pending",
  SUCCESS = "success",
  FAILED = "failed",
  CANCELLED = "cancelled",
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface AuthResult {
  success: boolean;
  user?: User;
  token?: string;
  refreshToken?: string;
  message?: string;
}

export interface FileData {
  filename: string;
  contentType: string;
  buffer: Buffer;
  size: number;
}

export interface FileInfo {
  filename: string;
  size: number;
  contentType: string;
  uploadDate: Date;
  url: string;
}

export interface DomainEvent {
  id: string;
  type: string;
  aggregateId: string;
  version: number;
  timestamp: Date;
  data: any;
}

/**
 * 接口工厂 - 创建实现实例的工厂
 * 这也是分离接口模式的一部分，用于解耦接口与具体实现
 */
export interface ServiceFactory {
  createUserRepository(): UserRepository;
  createProductRepository(): ProductRepository;
  createOrderRepository(): OrderRepository;
  createEmailService(): EmailService;
  createPaymentProcessor(): PaymentProcessor;
  createInventoryService(): InventoryService;
  createCacheService(): CacheService;
  createLogger(): Logger;
  createEventPublisher(): EventPublisher;
  createAuthenticationService(): AuthenticationService;
  createFileStorageService(): FileStorageService;
}

/**
 * 抽象工厂接口
 * 提供创建相关接口实现的方法
 */
export interface AbstractFactory {
  createRepositoryFactory(): RepositoryFactory;
  createServiceFactory(): ServiceFactory;
}

export interface RepositoryFactory {
  createUserRepository(): UserRepository;
  createProductRepository(): ProductRepository;
  createOrderRepository(): OrderRepository;
}
