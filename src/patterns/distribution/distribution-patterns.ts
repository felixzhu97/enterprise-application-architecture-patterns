/**
 * 分布式模式实现
 *
 * 这个文件包含了分布式系统中常用的模式：
 * 1. Remote Facade（远程外观）- 为细粒度对象提供粗粒度的远程接口
 * 2. Data Transfer Object（数据传输对象）- 在进程间传输数据的对象
 *
 * 这些模式主要用于解决网络通信中的性能问题，
 * 减少网络调用次数，提高分布式系统的效率。
 */

import { EventEmitter } from "events";

/**
 * 分布式模式异常
 */
export class DistributionPatternException extends Error {
  constructor(message: string, public readonly cause?: Error) {
    super(message);
    this.name = "DistributionPatternException";
  }
}

/**
 * 远程调用异常
 */
export class RemoteCallException extends DistributionPatternException {
  constructor(
    message: string,
    public readonly methodName?: string,
    public readonly serviceName?: string
  ) {
    super(message);
    this.name = "RemoteCallException";
    this.methodName = methodName;
    this.serviceName = serviceName;
  }
}

/**
 * 序列化异常
 */
export class SerializationException extends DistributionPatternException {
  constructor(message: string, public readonly objectType?: string) {
    super(message);
    this.name = "SerializationException";
    this.objectType = objectType;
  }
}

/**
 * 网络异常
 */
export class NetworkException extends DistributionPatternException {
  constructor(message: string, public readonly endpoint?: string) {
    super(message);
    this.name = "NetworkException";
    this.endpoint = endpoint;
  }
}

// ======================== Data Transfer Object 模式 ========================

/**
 * 数据传输对象接口
 */
export interface DataTransferObject {
  /**
   * 序列化为JSON
   */
  toJSON(): any;

  /**
   * 从JSON反序列化
   */
  fromJSON(json: any): void;

  /**
   * 验证数据有效性
   */
  validate(): boolean;

  /**
   * 获取版本号
   */
  getVersion(): string;
}

/**
 * 抽象DTO基类
 */
export abstract class AbstractDTO implements DataTransferObject {
  protected version: string = "1.0";
  protected timestamp: Date = new Date();

  abstract toJSON(): any;
  abstract fromJSON(json: any): void;
  abstract validate(): boolean;

  getVersion(): string {
    return this.version;
  }

  getTimestamp(): Date {
    return this.timestamp;
  }
}

/**
 * 用户DTO
 */
export class UserDTO extends AbstractDTO {
  public id: number;
  public username: string;
  public email: string;
  public firstName: string;
  public lastName: string;
  public isActive: boolean;
  public roles: string[];
  public lastLoginAt: Date | null;
  public createdAt: Date;
  public updatedAt: Date;

  constructor(
    id: number = 0,
    username: string = "",
    email: string = "",
    firstName: string = "",
    lastName: string = "",
    isActive: boolean = true,
    roles: string[] = [],
    lastLoginAt: Date | null = null,
    createdAt: Date = new Date(),
    updatedAt: Date = new Date()
  ) {
    super();
    this.id = id;
    this.username = username;
    this.email = email;
    this.firstName = firstName;
    this.lastName = lastName;
    this.isActive = isActive;
    this.roles = roles;
    this.lastLoginAt = lastLoginAt;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  toJSON(): any {
    return {
      id: this.id,
      username: this.username,
      email: this.email,
      firstName: this.firstName,
      lastName: this.lastName,
      isActive: this.isActive,
      roles: this.roles,
      lastLoginAt: this.lastLoginAt?.toISOString(),
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
      version: this.version,
      timestamp: this.timestamp.toISOString(),
    };
  }

  fromJSON(json: any): void {
    this.id = json.id || 0;
    this.username = json.username || "";
    this.email = json.email || "";
    this.firstName = json.firstName || "";
    this.lastName = json.lastName || "";
    this.isActive = json.isActive !== undefined ? json.isActive : true;
    this.roles = json.roles || [];
    this.lastLoginAt = json.lastLoginAt ? new Date(json.lastLoginAt) : null;
    this.createdAt = json.createdAt ? new Date(json.createdAt) : new Date();
    this.updatedAt = json.updatedAt ? new Date(json.updatedAt) : new Date();
    this.version = json.version || "1.0";
    this.timestamp = json.timestamp ? new Date(json.timestamp) : new Date();
  }

  validate(): boolean {
    return (
      this.username.length >= 3 &&
      this.email.includes("@") &&
      this.firstName.length > 0 &&
      this.lastName.length > 0
    );
  }

  getFullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }

  hasRole(role: string): boolean {
    return this.roles.includes(role);
  }

  static fromDomain(domainUser: any): UserDTO {
    return new UserDTO(
      domainUser.id,
      domainUser.username,
      domainUser.email,
      domainUser.firstName,
      domainUser.lastName,
      domainUser.isActive,
      domainUser.roles,
      domainUser.lastLoginAt,
      domainUser.createdAt,
      domainUser.updatedAt
    );
  }
}

/**
 * 产品DTO
 */
export class ProductDTO extends AbstractDTO {
  public id: number;
  public name: string;
  public description: string;
  public price: number;
  public category: string;
  public stock: number;
  public imageUrl: string;
  public isActive: boolean;
  public tags: string[];
  public createdAt: Date;
  public updatedAt: Date;

  constructor(
    id: number = 0,
    name: string = "",
    description: string = "",
    price: number = 0,
    category: string = "",
    stock: number = 0,
    imageUrl: string = "",
    isActive: boolean = true,
    tags: string[] = [],
    createdAt: Date = new Date(),
    updatedAt: Date = new Date()
  ) {
    super();
    this.id = id;
    this.name = name;
    this.description = description;
    this.price = price;
    this.category = category;
    this.stock = stock;
    this.imageUrl = imageUrl;
    this.isActive = isActive;
    this.tags = tags;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  toJSON(): any {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      price: this.price,
      category: this.category,
      stock: this.stock,
      imageUrl: this.imageUrl,
      isActive: this.isActive,
      tags: this.tags,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
      version: this.version,
      timestamp: this.timestamp.toISOString(),
    };
  }

  fromJSON(json: any): void {
    this.id = json.id || 0;
    this.name = json.name || "";
    this.description = json.description || "";
    this.price = json.price || 0;
    this.category = json.category || "";
    this.stock = json.stock || 0;
    this.imageUrl = json.imageUrl || "";
    this.isActive = json.isActive !== undefined ? json.isActive : true;
    this.tags = json.tags || [];
    this.createdAt = json.createdAt ? new Date(json.createdAt) : new Date();
    this.updatedAt = json.updatedAt ? new Date(json.updatedAt) : new Date();
    this.version = json.version || "1.0";
    this.timestamp = json.timestamp ? new Date(json.timestamp) : new Date();
  }

  validate(): boolean {
    return (
      this.name.length > 0 &&
      this.price >= 0 &&
      this.stock >= 0 &&
      this.category.length > 0
    );
  }

  isInStock(): boolean {
    return this.stock > 0;
  }

  hasTag(tag: string): boolean {
    return this.tags.includes(tag);
  }

  static fromDomain(domainProduct: any): ProductDTO {
    return new ProductDTO(
      domainProduct.id,
      domainProduct.name,
      domainProduct.description,
      domainProduct.price,
      domainProduct.category,
      domainProduct.stock,
      domainProduct.imageUrl,
      domainProduct.isActive,
      domainProduct.tags,
      domainProduct.createdAt,
      domainProduct.updatedAt
    );
  }
}

/**
 * 订单DTO
 */
export class OrderDTO extends AbstractDTO {
  public id: number;
  public userId: number;
  public customerInfo: CustomerInfoDTO;
  public items: OrderItemDTO[];
  public totalAmount: number;
  public status: string;
  public shippingAddress: AddressDTO;
  public billingAddress: AddressDTO;
  public paymentMethod: string;
  public orderDate: Date;
  public shippedDate: Date | null;
  public deliveredDate: Date | null;
  public notes: string;

  constructor(
    id: number = 0,
    userId: number = 0,
    customerInfo: CustomerInfoDTO = new CustomerInfoDTO(),
    items: OrderItemDTO[] = [],
    totalAmount: number = 0,
    status: string = "pending",
    shippingAddress: AddressDTO = new AddressDTO(),
    billingAddress: AddressDTO = new AddressDTO(),
    paymentMethod: string = "",
    orderDate: Date = new Date(),
    shippedDate: Date | null = null,
    deliveredDate: Date | null = null,
    notes: string = ""
  ) {
    super();
    this.id = id;
    this.userId = userId;
    this.customerInfo = customerInfo;
    this.items = items;
    this.totalAmount = totalAmount;
    this.status = status;
    this.shippingAddress = shippingAddress;
    this.billingAddress = billingAddress;
    this.paymentMethod = paymentMethod;
    this.orderDate = orderDate;
    this.shippedDate = shippedDate;
    this.deliveredDate = deliveredDate;
    this.notes = notes;
  }

  toJSON(): any {
    return {
      id: this.id,
      userId: this.userId,
      customerInfo: this.customerInfo.toJSON(),
      items: this.items.map((item) => item.toJSON()),
      totalAmount: this.totalAmount,
      status: this.status,
      shippingAddress: this.shippingAddress.toJSON(),
      billingAddress: this.billingAddress.toJSON(),
      paymentMethod: this.paymentMethod,
      orderDate: this.orderDate.toISOString(),
      shippedDate: this.shippedDate?.toISOString(),
      deliveredDate: this.deliveredDate?.toISOString(),
      notes: this.notes,
      version: this.version,
      timestamp: this.timestamp.toISOString(),
    };
  }

  fromJSON(json: any): void {
    this.id = json.id || 0;
    this.userId = json.userId || 0;

    this.customerInfo = new CustomerInfoDTO();
    if (json.customerInfo) {
      this.customerInfo.fromJSON(json.customerInfo);
    }

    this.items = (json.items || []).map((itemJson: any) => {
      const item = new OrderItemDTO();
      item.fromJSON(itemJson);
      return item;
    });

    this.totalAmount = json.totalAmount || 0;
    this.status = json.status || "pending";

    this.shippingAddress = new AddressDTO();
    if (json.shippingAddress) {
      this.shippingAddress.fromJSON(json.shippingAddress);
    }

    this.billingAddress = new AddressDTO();
    if (json.billingAddress) {
      this.billingAddress.fromJSON(json.billingAddress);
    }

    this.paymentMethod = json.paymentMethod || "";
    this.orderDate = json.orderDate ? new Date(json.orderDate) : new Date();
    this.shippedDate = json.shippedDate ? new Date(json.shippedDate) : null;
    this.deliveredDate = json.deliveredDate
      ? new Date(json.deliveredDate)
      : null;
    this.notes = json.notes || "";
    this.version = json.version || "1.0";
    this.timestamp = json.timestamp ? new Date(json.timestamp) : new Date();
  }

  validate(): boolean {
    return (
      this.userId > 0 &&
      this.items.length > 0 &&
      this.totalAmount > 0 &&
      this.customerInfo.validate() &&
      this.shippingAddress.validate() &&
      this.items.every((item) => item.validate())
    );
  }

  getItemCount(): number {
    return this.items.reduce((sum, item) => sum + item.quantity, 0);
  }

  static fromDomain(domainOrder: any): OrderDTO {
    const orderDTO = new OrderDTO();
    orderDTO.id = domainOrder.id;
    orderDTO.userId = domainOrder.userId;
    orderDTO.customerInfo = CustomerInfoDTO.fromDomain(
      domainOrder.customerInfo
    );
    orderDTO.items = domainOrder.items.map((item: any) =>
      OrderItemDTO.fromDomain(item)
    );
    orderDTO.totalAmount = domainOrder.totalAmount;
    orderDTO.status = domainOrder.status;
    orderDTO.shippingAddress = AddressDTO.fromDomain(
      domainOrder.shippingAddress
    );
    orderDTO.billingAddress = AddressDTO.fromDomain(domainOrder.billingAddress);
    orderDTO.paymentMethod = domainOrder.paymentMethod;
    orderDTO.orderDate = domainOrder.orderDate;
    orderDTO.shippedDate = domainOrder.shippedDate;
    orderDTO.deliveredDate = domainOrder.deliveredDate;
    orderDTO.notes = domainOrder.notes;
    return orderDTO;
  }
}

/**
 * 订单项DTO
 */
export class OrderItemDTO extends AbstractDTO {
  public id: number;
  public productId: number;
  public productName: string;
  public productPrice: number;
  public quantity: number;
  public subtotal: number;

  constructor(
    id: number = 0,
    productId: number = 0,
    productName: string = "",
    productPrice: number = 0,
    quantity: number = 0,
    subtotal: number = 0
  ) {
    super();
    this.id = id;
    this.productId = productId;
    this.productName = productName;
    this.productPrice = productPrice;
    this.quantity = quantity;
    this.subtotal = subtotal;
  }

  toJSON(): any {
    return {
      id: this.id,
      productId: this.productId,
      productName: this.productName,
      productPrice: this.productPrice,
      quantity: this.quantity,
      subtotal: this.subtotal,
      version: this.version,
      timestamp: this.timestamp.toISOString(),
    };
  }

  fromJSON(json: any): void {
    this.id = json.id || 0;
    this.productId = json.productId || 0;
    this.productName = json.productName || "";
    this.productPrice = json.productPrice || 0;
    this.quantity = json.quantity || 0;
    this.subtotal = json.subtotal || 0;
    this.version = json.version || "1.0";
    this.timestamp = json.timestamp ? new Date(json.timestamp) : new Date();
  }

  validate(): boolean {
    return (
      this.productId > 0 &&
      this.quantity > 0 &&
      this.productPrice >= 0 &&
      this.subtotal >= 0
    );
  }

  static fromDomain(domainItem: any): OrderItemDTO {
    return new OrderItemDTO(
      domainItem.id,
      domainItem.productId,
      domainItem.productName,
      domainItem.productPrice,
      domainItem.quantity,
      domainItem.subtotal
    );
  }
}

/**
 * 客户信息DTO
 */
export class CustomerInfoDTO extends AbstractDTO {
  public firstName: string;
  public lastName: string;
  public email: string;
  public phone: string;

  constructor(
    firstName: string = "",
    lastName: string = "",
    email: string = "",
    phone: string = ""
  ) {
    super();
    this.firstName = firstName;
    this.lastName = lastName;
    this.email = email;
    this.phone = phone;
  }

  toJSON(): any {
    return {
      firstName: this.firstName,
      lastName: this.lastName,
      email: this.email,
      phone: this.phone,
      version: this.version,
      timestamp: this.timestamp.toISOString(),
    };
  }

  fromJSON(json: any): void {
    this.firstName = json.firstName || "";
    this.lastName = json.lastName || "";
    this.email = json.email || "";
    this.phone = json.phone || "";
    this.version = json.version || "1.0";
    this.timestamp = json.timestamp ? new Date(json.timestamp) : new Date();
  }

  validate(): boolean {
    return (
      this.firstName.length > 0 &&
      this.lastName.length > 0 &&
      this.email.includes("@")
    );
  }

  getFullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }

  static fromDomain(domainCustomer: any): CustomerInfoDTO {
    return new CustomerInfoDTO(
      domainCustomer.firstName,
      domainCustomer.lastName,
      domainCustomer.email,
      domainCustomer.phone
    );
  }
}

/**
 * 地址DTO
 */
export class AddressDTO extends AbstractDTO {
  public street: string;
  public city: string;
  public state: string;
  public zipCode: string;
  public country: string;

  constructor(
    street: string = "",
    city: string = "",
    state: string = "",
    zipCode: string = "",
    country: string = ""
  ) {
    super();
    this.street = street;
    this.city = city;
    this.state = state;
    this.zipCode = zipCode;
    this.country = country;
  }

  toJSON(): any {
    return {
      street: this.street,
      city: this.city,
      state: this.state,
      zipCode: this.zipCode,
      country: this.country,
      version: this.version,
      timestamp: this.timestamp.toISOString(),
    };
  }

  fromJSON(json: any): void {
    this.street = json.street || "";
    this.city = json.city || "";
    this.state = json.state || "";
    this.zipCode = json.zipCode || "";
    this.country = json.country || "";
    this.version = json.version || "1.0";
    this.timestamp = json.timestamp ? new Date(json.timestamp) : new Date();
  }

  validate(): boolean {
    return (
      this.street.length > 0 && this.city.length > 0 && this.country.length > 0
    );
  }

  getFullAddress(): string {
    return `${this.street}, ${this.city}, ${this.state} ${this.zipCode}, ${this.country}`;
  }

  static fromDomain(domainAddress: any): AddressDTO {
    return new AddressDTO(
      domainAddress.street,
      domainAddress.city,
      domainAddress.state,
      domainAddress.zipCode,
      domainAddress.country
    );
  }
}

// ======================== Remote Facade 模式 ========================

/**
 * 远程方法调用结果
 */
export interface RemoteCallResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  errorCode?: string;
  executionTime?: number;
  callId?: string;
}

/**
 * 远程外观接口
 */
export interface RemoteFacade {
  /**
   * 调用远程方法
   */
  invoke<T = any>(
    methodName: string,
    ...args: any[]
  ): Promise<RemoteCallResult<T>>;

  /**
   * 获取服务名称
   */
  getServiceName(): string;

  /**
   * 获取服务版本
   */
  getServiceVersion(): string;

  /**
   * 检查连接状态
   */
  isConnected(): boolean;

  /**
   * 连接到远程服务
   */
  connect(): Promise<void>;

  /**
   * 断开连接
   */
  disconnect(): Promise<void>;
}

/**
 * 抽象远程外观基类
 */
export abstract class AbstractRemoteFacade implements RemoteFacade {
  protected serviceName: string;
  protected serviceVersion: string;
  protected endpoint: string;
  protected connected: boolean = false;
  protected callCounter: number = 0;

  constructor(serviceName: string, serviceVersion: string, endpoint: string) {
    this.serviceName = serviceName;
    this.serviceVersion = serviceVersion;
    this.endpoint = endpoint;
  }

  abstract invoke<T = any>(
    methodName: string,
    ...args: any[]
  ): Promise<RemoteCallResult<T>>;

  getServiceName(): string {
    return this.serviceName;
  }

  getServiceVersion(): string {
    return this.serviceVersion;
  }

  isConnected(): boolean {
    return this.connected;
  }

  async connect(): Promise<void> {
    // 模拟连接过程
    await this.delay(100);
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    // 模拟断开连接
    await this.delay(50);
    this.connected = false;
  }

  protected generateCallId(): string {
    return `${this.serviceName}-${++this.callCounter}-${Date.now()}`;
  }

  protected async delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * 用户服务远程外观
 */
export class UserServiceRemoteFacade extends AbstractRemoteFacade {
  constructor(endpoint: string) {
    super("UserService", "1.0", endpoint);
  }

  async invoke<T = any>(
    methodName: string,
    ...args: any[]
  ): Promise<RemoteCallResult<T>> {
    const callId = this.generateCallId();
    const startTime = Date.now();

    try {
      if (!this.connected) {
        throw new RemoteCallException(
          "Service not connected",
          methodName,
          this.serviceName
        );
      }

      let result: any;
      switch (methodName) {
        case "createUser":
          result = await this.createUser(args[0]);
          break;
        case "getUserById":
          result = await this.getUserById(args[0]);
          break;
        case "updateUser":
          result = await this.updateUser(args[0], args[1]);
          break;
        case "deleteUser":
          result = await this.deleteUser(args[0]);
          break;
        case "getUserList":
          result = await this.getUserList(args[0]);
          break;
        case "authenticateUser":
          result = await this.authenticateUser(args[0], args[1]);
          break;
        default:
          throw new RemoteCallException(
            `Method not found: ${methodName}`,
            methodName,
            this.serviceName
          );
      }

      const executionTime = Date.now() - startTime;
      return {
        success: true,
        data: result,
        executionTime,
        callId,
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      return {
        success: false,
        error: (error as Error).message,
        errorCode:
          error instanceof RemoteCallException
            ? "REMOTE_CALL_ERROR"
            : "UNKNOWN_ERROR",
        executionTime,
        callId,
      };
    }
  }

  private async createUser(userData: UserDTO): Promise<UserDTO> {
    // 模拟远程调用
    await this.delay(200);

    if (!userData.validate()) {
      throw new RemoteCallException(
        "Invalid user data",
        "createUser",
        this.serviceName
      );
    }

    const newUser = new UserDTO();
    newUser.fromJSON(userData.toJSON());
    newUser.id = Math.floor(Math.random() * 10000);
    newUser.createdAt = new Date();
    newUser.updatedAt = new Date();

    return newUser;
  }

  private async getUserById(userId: number): Promise<UserDTO | null> {
    // 模拟远程调用
    await this.delay(150);

    if (userId <= 0) {
      throw new RemoteCallException(
        "Invalid user ID",
        "getUserById",
        this.serviceName
      );
    }

    // 模拟数据库查询
    const userData = {
      id: userId,
      username: `user${userId}`,
      email: `user${userId}@example.com`,
      firstName: "John",
      lastName: "Doe",
      isActive: true,
      roles: ["user"],
      lastLoginAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return UserDTO.fromDomain(userData);
  }

  private async updateUser(
    userId: number,
    userData: UserDTO
  ): Promise<UserDTO> {
    // 模拟远程调用
    await this.delay(250);

    if (userId <= 0 || !userData.validate()) {
      throw new RemoteCallException(
        "Invalid user data",
        "updateUser",
        this.serviceName
      );
    }

    const updatedUser = new UserDTO();
    updatedUser.fromJSON(userData.toJSON());
    updatedUser.id = userId;
    updatedUser.updatedAt = new Date();

    return updatedUser;
  }

  private async deleteUser(userId: number): Promise<boolean> {
    // 模拟远程调用
    await this.delay(100);

    if (userId <= 0) {
      throw new RemoteCallException(
        "Invalid user ID",
        "deleteUser",
        this.serviceName
      );
    }

    return true;
  }

  private async getUserList(options: {
    page?: number;
    pageSize?: number;
    search?: string;
  }): Promise<{ users: UserDTO[]; totalCount: number }> {
    // 模拟远程调用
    await this.delay(300);

    const { page = 1, pageSize = 10, search = "" } = options;

    // 模拟生成用户列表
    const users: UserDTO[] = [];
    for (let i = 1; i <= pageSize; i++) {
      const userId = (page - 1) * pageSize + i;
      const user = new UserDTO(
        userId,
        `user${userId}`,
        `user${userId}@example.com`,
        "John",
        `Doe${userId}`,
        true,
        ["user"],
        new Date(),
        new Date(),
        new Date()
      );
      users.push(user);
    }

    return {
      users,
      totalCount: 100, // 模拟总数
    };
  }

  private async authenticateUser(
    username: string,
    password: string
  ): Promise<{ user: UserDTO; token: string }> {
    // 模拟远程调用
    await this.delay(400);

    if (!username || !password) {
      throw new RemoteCallException(
        "Invalid credentials",
        "authenticateUser",
        this.serviceName
      );
    }

    const user = new UserDTO(
      1,
      username,
      `${username}@example.com`,
      "John",
      "Doe",
      true,
      ["user"],
      new Date(),
      new Date(),
      new Date()
    );

    const token = `token-${username}-${Date.now()}`;

    return { user, token };
  }
}

/**
 * 订单服务远程外观
 */
export class OrderServiceRemoteFacade extends AbstractRemoteFacade {
  constructor(endpoint: string) {
    super("OrderService", "1.0", endpoint);
  }

  async invoke<T = any>(
    methodName: string,
    ...args: any[]
  ): Promise<RemoteCallResult<T>> {
    const callId = this.generateCallId();
    const startTime = Date.now();

    try {
      if (!this.connected) {
        throw new RemoteCallException(
          "Service not connected",
          methodName,
          this.serviceName
        );
      }

      let result: any;
      switch (methodName) {
        case "createOrder":
          result = await this.createOrder(args[0]);
          break;
        case "getOrderById":
          result = await this.getOrderById(args[0]);
          break;
        case "updateOrderStatus":
          result = await this.updateOrderStatus(args[0], args[1]);
          break;
        case "cancelOrder":
          result = await this.cancelOrder(args[0]);
          break;
        case "getOrdersByUser":
          result = await this.getOrdersByUser(args[0], args[1]);
          break;
        case "processPayment":
          result = await this.processPayment(args[0], args[1]);
          break;
        default:
          throw new RemoteCallException(
            `Method not found: ${methodName}`,
            methodName,
            this.serviceName
          );
      }

      const executionTime = Date.now() - startTime;
      return {
        success: true,
        data: result,
        executionTime,
        callId,
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      return {
        success: false,
        error: (error as Error).message,
        errorCode:
          error instanceof RemoteCallException
            ? "REMOTE_CALL_ERROR"
            : "UNKNOWN_ERROR",
        executionTime,
        callId,
      };
    }
  }

  private async createOrder(orderData: OrderDTO): Promise<OrderDTO> {
    // 模拟远程调用
    await this.delay(500);

    if (!orderData.validate()) {
      throw new RemoteCallException(
        "Invalid order data",
        "createOrder",
        this.serviceName
      );
    }

    const newOrder = new OrderDTO();
    newOrder.fromJSON(orderData.toJSON());
    newOrder.id = Math.floor(Math.random() * 10000);
    newOrder.orderDate = new Date();
    newOrder.status = "pending";

    return newOrder;
  }

  private async getOrderById(orderId: number): Promise<OrderDTO | null> {
    // 模拟远程调用
    await this.delay(200);

    if (orderId <= 0) {
      throw new RemoteCallException(
        "Invalid order ID",
        "getOrderById",
        this.serviceName
      );
    }

    // 模拟创建订单数据
    const orderData = this.createMockOrderData(orderId);
    return OrderDTO.fromDomain(orderData);
  }

  private async updateOrderStatus(
    orderId: number,
    status: string
  ): Promise<OrderDTO> {
    // 模拟远程调用
    await this.delay(300);

    if (orderId <= 0 || !status) {
      throw new RemoteCallException(
        "Invalid parameters",
        "updateOrderStatus",
        this.serviceName
      );
    }

    const orderData = this.createMockOrderData(orderId);
    orderData.status = status;

    return OrderDTO.fromDomain(orderData);
  }

  private async cancelOrder(orderId: number): Promise<boolean> {
    // 模拟远程调用
    await this.delay(400);

    if (orderId <= 0) {
      throw new RemoteCallException(
        "Invalid order ID",
        "cancelOrder",
        this.serviceName
      );
    }

    return true;
  }

  private async getOrdersByUser(
    userId: number,
    options: { page?: number; pageSize?: number }
  ): Promise<{ orders: OrderDTO[]; totalCount: number }> {
    // 模拟远程调用
    await this.delay(350);

    const { page = 1, pageSize = 10 } = options;

    const orders: OrderDTO[] = [];
    for (let i = 1; i <= pageSize; i++) {
      const orderId = (page - 1) * pageSize + i;
      const orderData = this.createMockOrderData(orderId, userId);
      orders.push(OrderDTO.fromDomain(orderData));
    }

    return {
      orders,
      totalCount: 50, // 模拟总数
    };
  }

  private async processPayment(
    orderId: number,
    paymentData: any
  ): Promise<{ paymentId: string; status: string }> {
    // 模拟远程调用
    await this.delay(800);

    if (orderId <= 0 || !paymentData) {
      throw new RemoteCallException(
        "Invalid payment data",
        "processPayment",
        this.serviceName
      );
    }

    return {
      paymentId: `payment-${orderId}-${Date.now()}`,
      status: "completed",
    };
  }

  private createMockOrderData(orderId: number, userId: number = 1): any {
    return {
      id: orderId,
      userId: userId,
      customerInfo: {
        firstName: "John",
        lastName: "Doe",
        email: "john@example.com",
        phone: "123-456-7890",
      },
      items: [
        {
          id: 1,
          productId: 1,
          productName: "笔记本电脑",
          productPrice: 1299.99,
          quantity: 1,
          subtotal: 1299.99,
        },
      ],
      totalAmount: 1299.99,
      status: "pending",
      shippingAddress: {
        street: "123 Main St",
        city: "New York",
        state: "NY",
        zipCode: "10001",
        country: "USA",
      },
      billingAddress: {
        street: "123 Main St",
        city: "New York",
        state: "NY",
        zipCode: "10001",
        country: "USA",
      },
      paymentMethod: "credit_card",
      orderDate: new Date(),
      shippedDate: null,
      deliveredDate: null,
      notes: "",
    };
  }
}

/**
 * 远程外观工厂
 */
export class RemoteFacadeFactory {
  private static facades: Map<string, RemoteFacade> = new Map();

  static getUserService(endpoint: string): UserServiceRemoteFacade {
    const key = `UserService-${endpoint}`;
    if (!this.facades.has(key)) {
      this.facades.set(key, new UserServiceRemoteFacade(endpoint));
    }
    return this.facades.get(key) as UserServiceRemoteFacade;
  }

  static getOrderService(endpoint: string): OrderServiceRemoteFacade {
    const key = `OrderService-${endpoint}`;
    if (!this.facades.has(key)) {
      this.facades.set(key, new OrderServiceRemoteFacade(endpoint));
    }
    return this.facades.get(key) as OrderServiceRemoteFacade;
  }

  static async connectAll(): Promise<void> {
    const connectionPromises = Array.from(this.facades.values()).map((facade) =>
      facade.connect()
    );
    await Promise.all(connectionPromises);
  }

  static async disconnectAll(): Promise<void> {
    const disconnectionPromises = Array.from(this.facades.values()).map(
      (facade) => facade.disconnect()
    );
    await Promise.all(disconnectionPromises);
  }
}

// ======================== 模式演示类 ========================

/**
 * 分布式模式演示类
 */
export class DistributionPatternsExample {
  private userService: UserServiceRemoteFacade;
  private orderService: OrderServiceRemoteFacade;

  constructor() {
    this.userService = RemoteFacadeFactory.getUserService(
      "http://localhost:8080/api/users"
    );
    this.orderService = RemoteFacadeFactory.getOrderService(
      "http://localhost:8080/api/orders"
    );
  }

  /**
   * 演示分布式模式
   */
  public async demonstrateDistributionPatterns(): Promise<void> {
    console.log("=== 分布式模式演示 ===");

    try {
      // 1. Data Transfer Object
      console.log("\n1. Data Transfer Object 模式:");
      await this.demonstrateDataTransferObject();

      // 2. Remote Facade
      console.log("\n2. Remote Facade 模式:");
      await this.demonstrateRemoteFacade();

      // 3. 综合应用
      console.log("\n3. 综合应用演示:");
      await this.demonstrateIntegratedScenario();

      this.printDistributionPatternsGuidelines();
    } catch (error) {
      console.error("分布式模式演示失败:", error);
    }
  }

  private async demonstrateDataTransferObject(): Promise<void> {
    // 创建用户DTO
    const userDTO = new UserDTO(
      1,
      "john_doe",
      "john@example.com",
      "John",
      "Doe",
      true,
      ["user", "admin"],
      new Date(),
      new Date(),
      new Date()
    );

    // 序列化
    const userJson = userDTO.toJSON();
    console.log(
      "✓ 用户DTO序列化:",
      JSON.stringify(userJson, null, 2).substring(0, 200) + "..."
    );

    // 反序列化
    const newUserDTO = new UserDTO();
    newUserDTO.fromJSON(userJson);
    console.log(
      "✓ 用户DTO反序列化:",
      newUserDTO.getFullName(),
      newUserDTO.email
    );

    // 验证
    const isValid = newUserDTO.validate();
    console.log("✓ 用户DTO验证:", isValid);

    // 创建订单DTO
    const orderDTO = new OrderDTO(
      1,
      1,
      new CustomerInfoDTO("John", "Doe", "john@example.com", "123-456-7890"),
      [
        new OrderItemDTO(1, 1, "笔记本电脑", 1299.99, 1, 1299.99),
        new OrderItemDTO(2, 2, "鼠标", 29.99, 2, 59.98),
      ],
      1359.97,
      "pending",
      new AddressDTO("123 Main St", "New York", "NY", "10001", "USA"),
      new AddressDTO("123 Main St", "New York", "NY", "10001", "USA"),
      "credit_card",
      new Date(),
      null,
      null,
      "Please deliver to front door"
    );

    // 序列化订单
    const orderJson = orderDTO.toJSON();
    console.log("✓ 订单DTO序列化完成，项目数量:", orderDTO.items.length);

    // 反序列化订单
    const newOrderDTO = new OrderDTO();
    newOrderDTO.fromJSON(orderJson);
    console.log("✓ 订单DTO反序列化完成，总金额:", newOrderDTO.totalAmount);

    // 验证订单
    const orderValid = newOrderDTO.validate();
    console.log("✓ 订单DTO验证:", orderValid);
  }

  private async demonstrateRemoteFacade(): Promise<void> {
    try {
      // 连接服务
      await this.userService.connect();
      await this.orderService.connect();
      console.log("✓ 远程服务连接成功");

      // 用户服务调用
      const createUserResult = await this.userService.invoke(
        "createUser",
        new UserDTO(
          0,
          "remote_user",
          "remote@example.com",
          "Remote",
          "User",
          true,
          ["user"],
          null,
          new Date(),
          new Date()
        )
      );

      if (createUserResult.success) {
        console.log(
          "✓ 创建用户成功:",
          (createUserResult.data as UserDTO).getFullName()
        );
        console.log("✓ 执行时间:", createUserResult.executionTime + "ms");
      } else {
        console.log("✗ 创建用户失败:", createUserResult.error);
      }

      // 获取用户列表
      const getUserListResult = await this.userService.invoke("getUserList", {
        page: 1,
        pageSize: 5,
      });
      if (getUserListResult.success) {
        const { users, totalCount } = getUserListResult.data;
        console.log(
          "✓ 获取用户列表成功，用户数量:",
          users.length,
          "总数:",
          totalCount
        );
      }

      // 用户认证
      const authResult = await this.userService.invoke(
        "authenticateUser",
        "john_doe",
        "password123"
      );
      if (authResult.success) {
        const { user, token } = authResult.data;
        console.log(
          "✓ 用户认证成功:",
          user.username,
          "Token:",
          token.substring(0, 20) + "..."
        );
      }

      // 订单服务调用
      const orderData = new OrderDTO(
        0,
        1,
        new CustomerInfoDTO("John", "Doe", "john@example.com", "123-456-7890"),
        [new OrderItemDTO(1, 1, "笔记本电脑", 1299.99, 1, 1299.99)],
        1299.99,
        "pending",
        new AddressDTO("123 Main St", "New York", "NY", "10001", "USA"),
        new AddressDTO("123 Main St", "New York", "NY", "10001", "USA"),
        "credit_card"
      );

      const createOrderResult = await this.orderService.invoke(
        "createOrder",
        orderData
      );
      if (createOrderResult.success) {
        const createdOrder = createOrderResult.data as OrderDTO;
        console.log("✓ 创建订单成功，订单ID:", createdOrder.id);
        console.log("✓ 执行时间:", createOrderResult.executionTime + "ms");
      }

      // 处理支付
      const paymentResult = await this.orderService.invoke(
        "processPayment",
        1,
        {
          cardNumber: "1234567890123456",
          expiryDate: "12/25",
          cvv: "123",
        }
      );

      if (paymentResult.success) {
        const { paymentId, status } = paymentResult.data;
        console.log("✓ 支付处理成功，支付ID:", paymentId, "状态:", status);
      }
    } finally {
      // 断开连接
      await this.userService.disconnect();
      await this.orderService.disconnect();
      console.log("✓ 远程服务断开连接");
    }
  }

  private async demonstrateIntegratedScenario(): Promise<void> {
    console.log("执行完整的电商场景：用户注册 -> 创建订单 -> 支付");

    try {
      // 连接所有服务
      await RemoteFacadeFactory.connectAll();
      console.log("✓ 所有服务已连接");

      // 1. 用户注册
      const newUser = new UserDTO(
        0,
        "ecommerce_user",
        "ecommerce@example.com",
        "E-commerce",
        "User",
        true,
        ["customer"],
        null,
        new Date(),
        new Date()
      );

      const userResult = await this.userService.invoke("createUser", newUser);
      if (!userResult.success) {
        throw new Error(`用户创建失败: ${userResult.error}`);
      }

      const createdUser = userResult.data as UserDTO;
      console.log("✓ 用户注册成功:", createdUser.getFullName());

      // 2. 创建订单
      const orderData = new OrderDTO(
        0,
        createdUser.id,
        new CustomerInfoDTO(
          createdUser.firstName,
          createdUser.lastName,
          createdUser.email,
          "123-456-7890"
        ),
        [
          new OrderItemDTO(1, 1, "笔记本电脑", 1299.99, 1, 1299.99),
          new OrderItemDTO(2, 2, "鼠标", 29.99, 1, 29.99),
        ],
        1329.98,
        "pending",
        new AddressDTO("123 Main St", "New York", "NY", "10001", "USA"),
        new AddressDTO("123 Main St", "New York", "NY", "10001", "USA"),
        "credit_card"
      );

      const orderResult = await this.orderService.invoke(
        "createOrder",
        orderData
      );
      if (!orderResult.success) {
        throw new Error(`订单创建失败: ${orderResult.error}`);
      }

      const createdOrder = orderResult.data as OrderDTO;
      console.log(
        "✓ 订单创建成功，订单ID:",
        createdOrder.id,
        "总金额:",
        createdOrder.totalAmount
      );

      // 3. 处理支付
      const paymentResult = await this.orderService.invoke(
        "processPayment",
        createdOrder.id,
        {
          cardNumber: "1234567890123456",
          expiryDate: "12/25",
          cvv: "123",
          amount: createdOrder.totalAmount,
        }
      );

      if (!paymentResult.success) {
        throw new Error(`支付处理失败: ${paymentResult.error}`);
      }

      console.log("✓ 支付处理成功，支付ID:", paymentResult.data.paymentId);

      // 4. 更新订单状态
      const statusResult = await this.orderService.invoke(
        "updateOrderStatus",
        createdOrder.id,
        "paid"
      );
      if (statusResult.success) {
        console.log("✓ 订单状态更新成功");
      }

      console.log("✓ 完整的电商场景执行成功");
    } catch (error) {
      console.error("✗ 电商场景执行失败:", (error as Error).message);
    } finally {
      // 断开所有连接
      await RemoteFacadeFactory.disconnectAll();
      console.log("✓ 所有服务已断开连接");
    }
  }

  private printDistributionPatternsGuidelines(): void {
    console.log(`
分布式模式使用指南：

1. Data Transfer Object (DTO)：
   - 在进程间传输数据的对象
   - 包含序列化/反序列化逻辑
   - 提供数据验证功能
   - 版本控制和兼容性

2. Remote Facade：
   - 为细粒度对象提供粗粒度远程接口
   - 减少网络调用次数
   - 封装复杂的远程交互
   - 提供统一的错误处理

设计原则：
- 最小化网络调用
- 粗粒度接口设计
- 数据传输优化
- 错误处理和重试机制
- 版本兼容性

适用场景：
- 分布式系统
- 微服务架构
- 网络通信密集型应用
- 需要跨进程数据传输

最佳实践：
- 使用DTO封装传输数据
- 提供粗粒度的远程接口
- 实现适当的缓存机制
- 处理网络异常和超时
- 支持异步调用
- 考虑安全性和认证

性能优化：
- 批量操作接口
- 数据压缩
- 连接池管理
- 超时和重试机制
- 监控和日志记录

与其他模式的关系：
- 与Service Layer配合使用
- 可以集成到Gateway中
- 支持Repository的远程实现
- 与Observer模式处理事件通知

注意事项：
- 网络延迟和不稳定性
- 数据一致性问题
- 版本兼容性
- 安全性考虑
- 监控和调试难度
    `);
  }
}
