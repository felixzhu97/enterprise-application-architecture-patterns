/**
 * Service Stub（服务桩）模式
 *
 * 在测试中用来替代真实服务的简化实现。
 * 提供可预测的、可控制的行为，便于测试。
 *
 * 主要特点：
 * - 替代真实服务
 * - 提供可预测的行为
 * - 简化测试环境
 * - 隔离外部依赖
 *
 * 优点：
 * - 提高测试速度
 * - 消除外部依赖
 * - 便于测试控制
 * - 可预测的行为
 *
 * 缺点：
 * - 可能与真实服务有差异
 * - 需要维护一致性
 * - 增加代码复杂度
 *
 * 适用场景：
 * - 单元测试
 * - 集成测试
 * - 外部服务不可用时
 * - 需要模拟特定行为
 */

/**
 * 邮件服务接口
 */
export interface IEmailService {
  sendEmail(to: string, subject: string, body: string): Promise<boolean>;
  sendBulkEmail(
    recipients: string[],
    subject: string,
    body: string
  ): Promise<boolean>;
  validateEmail(email: string): boolean;
  getEmailStatus(messageId: string): Promise<EmailStatus>;
}

/**
 * 邮件状态
 */
export enum EmailStatus {
  Pending = "pending",
  Sent = "sent",
  Delivered = "delivered",
  Failed = "failed",
  Bounced = "bounced",
}

/**
 * 真实邮件服务实现
 */
export class RealEmailService implements IEmailService {
  private apiKey: string;
  private baseUrl: string;

  constructor(
    apiKey: string,
    baseUrl: string = "https://api.email-service.com"
  ) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  async sendEmail(to: string, subject: string, body: string): Promise<boolean> {
    try {
      // 实际的HTTP请求发送邮件
      const response = await fetch(`${this.baseUrl}/send`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ to, subject, body }),
      });

      return response.ok;
    } catch (error) {
      console.error("邮件发送失败:", error);
      return false;
    }
  }

  async sendBulkEmail(
    recipients: string[],
    subject: string,
    body: string
  ): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/send-bulk`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ recipients, subject, body }),
      });

      return response.ok;
    } catch (error) {
      console.error("批量邮件发送失败:", error);
      return false;
    }
  }

  validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  async getEmailStatus(messageId: string): Promise<EmailStatus> {
    try {
      const response = await fetch(`${this.baseUrl}/status/${messageId}`, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        return data.status as EmailStatus;
      }

      return EmailStatus.Failed;
    } catch (error) {
      console.error("获取邮件状态失败:", error);
      return EmailStatus.Failed;
    }
  }
}

/**
 * 邮件服务桩 - 用于测试
 */
export class EmailServiceStub implements IEmailService {
  private sentEmails: Array<{
    to: string;
    subject: string;
    body: string;
    timestamp: Date;
    messageId: string;
  }> = [];

  private bulkEmails: Array<{
    recipients: string[];
    subject: string;
    body: string;
    timestamp: Date;
    messageId: string;
  }> = [];

  private emailStatuses: Map<string, EmailStatus> = new Map();
  private shouldFail: boolean = false;
  private failureRate: number = 0;

  /**
   * 设置是否应该失败
   */
  setShouldFail(shouldFail: boolean): void {
    this.shouldFail = shouldFail;
  }

  /**
   * 设置失败率（0-1之间）
   */
  setFailureRate(rate: number): void {
    this.failureRate = Math.max(0, Math.min(1, rate));
  }

  /**
   * 模拟发送邮件
   */
  async sendEmail(to: string, subject: string, body: string): Promise<boolean> {
    // 模拟网络延迟
    await this.simulateDelay();

    // 检查是否应该失败
    if (this.shouldFail || Math.random() < this.failureRate) {
      return false;
    }

    // 验证邮箱格式
    if (!this.validateEmail(to)) {
      return false;
    }

    const messageId = this.generateMessageId();

    // 记录发送的邮件
    this.sentEmails.push({
      to,
      subject,
      body,
      timestamp: new Date(),
      messageId,
    });

    // 设置邮件状态
    this.emailStatuses.set(messageId, EmailStatus.Sent);

    // 模拟异步状态更新
    setTimeout(() => {
      this.emailStatuses.set(messageId, EmailStatus.Delivered);
    }, 100);

    return true;
  }

  /**
   * 模拟批量发送邮件
   */
  async sendBulkEmail(
    recipients: string[],
    subject: string,
    body: string
  ): Promise<boolean> {
    // 模拟网络延迟
    await this.simulateDelay(recipients.length * 10);

    // 检查是否应该失败
    if (this.shouldFail || Math.random() < this.failureRate) {
      return false;
    }

    // 验证所有邮箱格式
    const validRecipients = recipients.filter((email) =>
      this.validateEmail(email)
    );
    if (validRecipients.length === 0) {
      return false;
    }

    const messageId = this.generateMessageId();

    // 记录批量邮件
    this.bulkEmails.push({
      recipients: validRecipients,
      subject,
      body,
      timestamp: new Date(),
      messageId,
    });

    // 设置邮件状态
    this.emailStatuses.set(messageId, EmailStatus.Sent);

    // 模拟异步状态更新
    setTimeout(() => {
      this.emailStatuses.set(messageId, EmailStatus.Delivered);
    }, 200);

    return true;
  }

  /**
   * 验证邮箱格式
   */
  validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * 获取邮件状态
   */
  async getEmailStatus(messageId: string): Promise<EmailStatus> {
    // 模拟网络延迟
    await this.simulateDelay();

    return this.emailStatuses.get(messageId) || EmailStatus.Failed;
  }

  // ================= 测试辅助方法 =================

  /**
   * 获取所有发送的邮件
   */
  getSentEmails(): Array<{
    to: string;
    subject: string;
    body: string;
    timestamp: Date;
    messageId: string;
  }> {
    return [...this.sentEmails];
  }

  /**
   * 获取批量发送的邮件
   */
  getBulkEmails(): Array<{
    recipients: string[];
    subject: string;
    body: string;
    timestamp: Date;
    messageId: string;
  }> {
    return [...this.bulkEmails];
  }

  /**
   * 清空发送记录
   */
  clearSentEmails(): void {
    this.sentEmails = [];
    this.bulkEmails = [];
    this.emailStatuses.clear();
  }

  /**
   * 获取发送邮件总数
   */
  getSentEmailCount(): number {
    return this.sentEmails.length;
  }

  /**
   * 检查是否发送了特定邮件
   */
  hasEmailBeenSent(to: string, subject: string): boolean {
    return this.sentEmails.some(
      (email) => email.to === to && email.subject === subject
    );
  }

  /**
   * 获取发送给特定收件人的邮件
   */
  getEmailsForRecipient(recipient: string): Array<{
    to: string;
    subject: string;
    body: string;
    timestamp: Date;
    messageId: string;
  }> {
    return this.sentEmails.filter((email) => email.to === recipient);
  }

  /**
   * 模拟网络延迟
   */
  private async simulateDelay(ms: number = 50): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * 生成消息ID
   */
  private generateMessageId(): string {
    return "msg_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
  }
}

// ======================== 支付服务 ========================

/**
 * 支付服务接口
 */
export interface IPaymentService {
  processPayment(
    amount: number,
    currency: string,
    paymentMethod: PaymentMethod
  ): Promise<PaymentResult>;
  refundPayment(transactionId: string, amount: number): Promise<RefundResult>;
  getPaymentStatus(transactionId: string): Promise<PaymentStatus>;
  validatePaymentMethod(paymentMethod: PaymentMethod): boolean;
}

/**
 * 支付方式
 */
export interface PaymentMethod {
  type: "credit_card" | "debit_card" | "paypal" | "apple_pay" | "google_pay";
  details: {
    cardNumber?: string;
    expiryDate?: string;
    cvv?: string;
    email?: string;
    token?: string;
  };
}

/**
 * 支付结果
 */
export interface PaymentResult {
  success: boolean;
  transactionId?: string;
  errorMessage?: string;
  processingFee?: number;
}

/**
 * 退款结果
 */
export interface RefundResult {
  success: boolean;
  refundId?: string;
  errorMessage?: string;
  refundAmount?: number;
}

/**
 * 支付状态
 */
export enum PaymentStatus {
  Pending = "pending",
  Processing = "processing",
  Success = "success",
  Failed = "failed",
  Cancelled = "cancelled",
  Refunded = "refunded",
}

/**
 * 真实支付服务实现
 */
export class RealPaymentService implements IPaymentService {
  private apiKey: string;
  private baseUrl: string;

  constructor(
    apiKey: string,
    baseUrl: string = "https://api.payment-gateway.com"
  ) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  async processPayment(
    amount: number,
    currency: string,
    paymentMethod: PaymentMethod
  ): Promise<PaymentResult> {
    try {
      const response = await fetch(`${this.baseUrl}/charge`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount,
          currency,
          payment_method: paymentMethod,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        return {
          success: true,
          transactionId: data.transaction_id,
          processingFee: data.processing_fee,
        };
      } else {
        return {
          success: false,
          errorMessage: data.error,
        };
      }
    } catch (error) {
      return {
        success: false,
        errorMessage: `支付处理失败: ${(error as Error).message}`,
      };
    }
  }

  async refundPayment(
    transactionId: string,
    amount: number
  ): Promise<RefundResult> {
    try {
      const response = await fetch(`${this.baseUrl}/refund`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          transaction_id: transactionId,
          amount,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        return {
          success: true,
          refundId: data.refund_id,
          refundAmount: data.refund_amount,
        };
      } else {
        return {
          success: false,
          errorMessage: data.error,
        };
      }
    } catch (error) {
      return {
        success: false,
        errorMessage: `退款处理失败: ${(error as Error).message}`,
      };
    }
  }

  async getPaymentStatus(transactionId: string): Promise<PaymentStatus> {
    try {
      const response = await fetch(`${this.baseUrl}/status/${transactionId}`, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        return data.status as PaymentStatus;
      }

      return PaymentStatus.Failed;
    } catch (error) {
      return PaymentStatus.Failed;
    }
  }

  validatePaymentMethod(paymentMethod: PaymentMethod): boolean {
    switch (paymentMethod.type) {
      case "credit_card":
      case "debit_card":
        return !!(
          paymentMethod.details.cardNumber &&
          paymentMethod.details.expiryDate &&
          paymentMethod.details.cvv
        );
      case "paypal":
        return !!paymentMethod.details.email;
      case "apple_pay":
      case "google_pay":
        return !!paymentMethod.details.token;
      default:
        return false;
    }
  }
}

/**
 * 支付服务桩 - 用于测试
 */
export class PaymentServiceStub implements IPaymentService {
  private transactions: Map<
    string,
    {
      amount: number;
      currency: string;
      paymentMethod: PaymentMethod;
      status: PaymentStatus;
      timestamp: Date;
    }
  > = new Map();

  private refunds: Map<
    string,
    {
      transactionId: string;
      amount: number;
      status: PaymentStatus;
      timestamp: Date;
    }
  > = new Map();

  private shouldFail: boolean = false;
  private failureRate: number = 0;
  private processingFee: number = 0.029; // 2.9%

  /**
   * 设置是否应该失败
   */
  setShouldFail(shouldFail: boolean): void {
    this.shouldFail = shouldFail;
  }

  /**
   * 设置失败率（0-1之间）
   */
  setFailureRate(rate: number): void {
    this.failureRate = Math.max(0, Math.min(1, rate));
  }

  /**
   * 设置处理费率
   */
  setProcessingFee(rate: number): void {
    this.processingFee = Math.max(0, rate);
  }

  /**
   * 模拟处理支付
   */
  async processPayment(
    amount: number,
    currency: string,
    paymentMethod: PaymentMethod
  ): Promise<PaymentResult> {
    // 模拟网络延迟
    await this.simulateDelay();

    // 验证支付方式
    if (!this.validatePaymentMethod(paymentMethod)) {
      return {
        success: false,
        errorMessage: "无效的支付方式",
      };
    }

    // 验证金额
    if (amount <= 0) {
      return {
        success: false,
        errorMessage: "支付金额必须大于0",
      };
    }

    // 检查是否应该失败
    if (this.shouldFail || Math.random() < this.failureRate) {
      return {
        success: false,
        errorMessage: "支付处理失败",
      };
    }

    // 模拟特定卡号的失败情况
    if (
      paymentMethod.type === "credit_card" &&
      paymentMethod.details.cardNumber === "4000000000000002"
    ) {
      return {
        success: false,
        errorMessage: "卡被拒绝",
      };
    }

    const transactionId = this.generateTransactionId();
    const fee = amount * this.processingFee;

    // 记录交易
    this.transactions.set(transactionId, {
      amount,
      currency,
      paymentMethod,
      status: PaymentStatus.Success,
      timestamp: new Date(),
    });

    return {
      success: true,
      transactionId,
      processingFee: fee,
    };
  }

  /**
   * 模拟退款
   */
  async refundPayment(
    transactionId: string,
    amount: number
  ): Promise<RefundResult> {
    // 模拟网络延迟
    await this.simulateDelay();

    const transaction = this.transactions.get(transactionId);
    if (!transaction) {
      return {
        success: false,
        errorMessage: "交易不存在",
      };
    }

    if (transaction.status !== PaymentStatus.Success) {
      return {
        success: false,
        errorMessage: "交易状态不允许退款",
      };
    }

    if (amount > transaction.amount) {
      return {
        success: false,
        errorMessage: "退款金额不能超过原交易金额",
      };
    }

    // 检查是否应该失败
    if (this.shouldFail || Math.random() < this.failureRate) {
      return {
        success: false,
        errorMessage: "退款处理失败",
      };
    }

    const refundId = this.generateRefundId();

    // 记录退款
    this.refunds.set(refundId, {
      transactionId,
      amount,
      status: PaymentStatus.Refunded,
      timestamp: new Date(),
    });

    // 更新原交易状态
    transaction.status = PaymentStatus.Refunded;

    return {
      success: true,
      refundId,
      refundAmount: amount,
    };
  }

  /**
   * 获取支付状态
   */
  async getPaymentStatus(transactionId: string): Promise<PaymentStatus> {
    // 模拟网络延迟
    await this.simulateDelay();

    const transaction = this.transactions.get(transactionId);
    return transaction ? transaction.status : PaymentStatus.Failed;
  }

  /**
   * 验证支付方式
   */
  validatePaymentMethod(paymentMethod: PaymentMethod): boolean {
    switch (paymentMethod.type) {
      case "credit_card":
      case "debit_card":
        return !!(
          paymentMethod.details.cardNumber &&
          paymentMethod.details.expiryDate &&
          paymentMethod.details.cvv
        );
      case "paypal":
        return !!paymentMethod.details.email;
      case "apple_pay":
      case "google_pay":
        return !!paymentMethod.details.token;
      default:
        return false;
    }
  }

  // ================= 测试辅助方法 =================

  /**
   * 获取所有交易
   */
  getTransactions(): Array<{
    transactionId: string;
    amount: number;
    currency: string;
    paymentMethod: PaymentMethod;
    status: PaymentStatus;
    timestamp: Date;
  }> {
    return Array.from(this.transactions.entries()).map(([id, transaction]) => ({
      transactionId: id,
      ...transaction,
    }));
  }

  /**
   * 获取所有退款
   */
  getRefunds(): Array<{
    refundId: string;
    transactionId: string;
    amount: number;
    status: PaymentStatus;
    timestamp: Date;
  }> {
    return Array.from(this.refunds.entries()).map(([id, refund]) => ({
      refundId: id,
      ...refund,
    }));
  }

  /**
   * 清空交易记录
   */
  clearTransactions(): void {
    this.transactions.clear();
    this.refunds.clear();
  }

  /**
   * 获取交易总数
   */
  getTransactionCount(): number {
    return this.transactions.size;
  }

  /**
   * 获取成功交易总金额
   */
  getSuccessfulTransactionAmount(): number {
    return Array.from(this.transactions.values())
      .filter((t) => t.status === PaymentStatus.Success)
      .reduce((sum, t) => sum + t.amount, 0);
  }

  /**
   * 模拟网络延迟
   */
  private async simulateDelay(ms: number = 100): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * 生成交易ID
   */
  private generateTransactionId(): string {
    return "txn_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
  }

  /**
   * 生成退款ID
   */
  private generateRefundId(): string {
    return "ref_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
  }
}

// ======================== 外部API服务 ========================

/**
 * 外部API服务接口
 */
export interface IExternalApiService {
  getUserProfile(userId: string): Promise<UserProfile | null>;
  updateUserProfile(
    userId: string,
    profile: Partial<UserProfile>
  ): Promise<boolean>;
  getWeatherInfo(city: string): Promise<WeatherInfo | null>;
  translateText(text: string, targetLanguage: string): Promise<string | null>;
}

/**
 * 用户资料
 */
export interface UserProfile {
  id: string;
  username: string;
  email: string;
  fullName: string;
  avatar: string;
  bio: string;
  location: string;
  joinDate: Date;
}

/**
 * 天气信息
 */
export interface WeatherInfo {
  city: string;
  temperature: number;
  humidity: number;
  description: string;
  windSpeed: number;
  pressure: number;
  visibility: number;
}

/**
 * 外部API服务桩
 */
export class ExternalApiServiceStub implements IExternalApiService {
  private userProfiles: Map<string, UserProfile> = new Map();
  private weatherData: Map<string, WeatherInfo> = new Map();
  private translations: Map<string, string> = new Map();
  private shouldFail: boolean = false;
  private networkLatency: number = 100;

  constructor() {
    // 初始化一些测试数据
    this.initializeTestData();
  }

  /**
   * 设置是否应该失败
   */
  setShouldFail(shouldFail: boolean): void {
    this.shouldFail = shouldFail;
  }

  /**
   * 设置网络延迟
   */
  setNetworkLatency(ms: number): void {
    this.networkLatency = Math.max(0, ms);
  }

  /**
   * 模拟获取用户资料
   */
  async getUserProfile(userId: string): Promise<UserProfile | null> {
    await this.simulateDelay();

    if (this.shouldFail) {
      throw new Error("API服务不可用");
    }

    return this.userProfiles.get(userId) || null;
  }

  /**
   * 模拟更新用户资料
   */
  async updateUserProfile(
    userId: string,
    profile: Partial<UserProfile>
  ): Promise<boolean> {
    await this.simulateDelay();

    if (this.shouldFail) {
      return false;
    }

    const existingProfile = this.userProfiles.get(userId);
    if (!existingProfile) {
      return false;
    }

    // 更新用户资料
    const updatedProfile = { ...existingProfile, ...profile };
    this.userProfiles.set(userId, updatedProfile);

    return true;
  }

  /**
   * 模拟获取天气信息
   */
  async getWeatherInfo(city: string): Promise<WeatherInfo | null> {
    await this.simulateDelay();

    if (this.shouldFail) {
      throw new Error("天气服务不可用");
    }

    // 如果没有预设数据，生成随机天气信息
    if (!this.weatherData.has(city)) {
      const randomWeather: WeatherInfo = {
        city,
        temperature: Math.floor(Math.random() * 40) - 10, // -10到30度
        humidity: Math.floor(Math.random() * 100),
        description: this.getRandomWeatherDescription(),
        windSpeed: Math.floor(Math.random() * 30),
        pressure: 950 + Math.floor(Math.random() * 100),
        visibility: Math.floor(Math.random() * 20) + 5,
      };
      this.weatherData.set(city, randomWeather);
    }

    return this.weatherData.get(city) || null;
  }

  /**
   * 模拟文本翻译
   */
  async translateText(
    text: string,
    targetLanguage: string
  ): Promise<string | null> {
    await this.simulateDelay();

    if (this.shouldFail) {
      throw new Error("翻译服务不可用");
    }

    const key = `${text}_${targetLanguage}`;

    // 如果没有预设翻译，返回模拟翻译
    if (!this.translations.has(key)) {
      const mockTranslation = `[${targetLanguage.toUpperCase()}] ${text}`;
      this.translations.set(key, mockTranslation);
    }

    return this.translations.get(key) || null;
  }

  // ================= 测试辅助方法 =================

  /**
   * 添加测试用户资料
   */
  addUserProfile(profile: UserProfile): void {
    this.userProfiles.set(profile.id, profile);
  }

  /**
   * 设置天气数据
   */
  setWeatherData(city: string, weather: WeatherInfo): void {
    this.weatherData.set(city, weather);
  }

  /**
   * 添加翻译数据
   */
  addTranslation(
    text: string,
    targetLanguage: string,
    translation: string
  ): void {
    const key = `${text}_${targetLanguage}`;
    this.translations.set(key, translation);
  }

  /**
   * 清空所有数据
   */
  clearAllData(): void {
    this.userProfiles.clear();
    this.weatherData.clear();
    this.translations.clear();
    this.initializeTestData();
  }

  /**
   * 模拟网络延迟
   */
  private async simulateDelay(): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, this.networkLatency));
  }

  /**
   * 初始化测试数据
   */
  private initializeTestData(): void {
    // 添加一些测试用户资料
    this.userProfiles.set("user1", {
      id: "user1",
      username: "testuser",
      email: "test@example.com",
      fullName: "测试用户",
      avatar: "/avatars/default.jpg",
      bio: "这是一个测试用户",
      location: "北京",
      joinDate: new Date("2023-01-01"),
    });

    // 添加一些天气数据
    this.weatherData.set("北京", {
      city: "北京",
      temperature: 25,
      humidity: 65,
      description: "晴朗",
      windSpeed: 12,
      pressure: 1013,
      visibility: 15,
    });

    // 添加一些翻译数据
    this.translations.set("Hello_zh", "你好");
    this.translations.set("Good morning_zh", "早上好");
    this.translations.set("Thank you_zh", "谢谢");
  }

  /**
   * 获取随机天气描述
   */
  private getRandomWeatherDescription(): string {
    const descriptions = [
      "晴朗",
      "多云",
      "阴天",
      "小雨",
      "中雨",
      "大雨",
      "雷雨",
      "雪",
      "雾",
    ];
    return descriptions[Math.floor(Math.random() * descriptions.length)];
  }
}

/**
 * Service Stub使用示例
 */
export class ServiceStubExample {
  private emailService: IEmailService;
  private paymentService: IPaymentService;
  private externalApiService: IExternalApiService;

  constructor(useStubs: boolean = true) {
    if (useStubs) {
      // 使用服务桩进行测试
      this.emailService = new EmailServiceStub();
      this.paymentService = new PaymentServiceStub();
      this.externalApiService = new ExternalApiServiceStub();
    } else {
      // 使用真实服务
      this.emailService = new RealEmailService("test-api-key");
      this.paymentService = new RealPaymentService("test-api-key");
      this.externalApiService = new ExternalApiServiceStub(); // 这里仍用桩，因为外部API可能不可用
    }
  }

  /**
   * 演示Service Stub模式的使用
   */
  async demonstrateServiceStub() {
    console.log("=== Service Stub模式演示 ===");

    try {
      // 1. 邮件服务测试
      await this.demonstrateEmailService();

      // 2. 支付服务测试
      await this.demonstratePaymentService();

      // 3. 外部API服务测试
      await this.demonstrateExternalApiService();

      this.printServiceStubGuidelines();
    } catch (error) {
      console.error("Service Stub演示失败:", error);
    }
  }

  /**
   * 演示邮件服务
   */
  private async demonstrateEmailService(): Promise<void> {
    console.log("\n1. 邮件服务测试:");

    // 发送单个邮件
    const result1 = await this.emailService.sendEmail(
      "test@example.com",
      "测试邮件",
      "这是一封测试邮件"
    );
    console.log("✓ 发送单个邮件:", result1);

    // 发送批量邮件
    const result2 = await this.emailService.sendBulkEmail(
      ["user1@example.com", "user2@example.com"],
      "批量邮件",
      "这是一封批量邮件"
    );
    console.log("✓ 发送批量邮件:", result2);

    // 如果是服务桩，显示测试统计
    if (this.emailService instanceof EmailServiceStub) {
      const emailStub = this.emailService as EmailServiceStub;
      console.log("✓ 发送邮件总数:", emailStub.getSentEmailCount());
      console.log(
        "✓ 是否发送了测试邮件:",
        emailStub.hasEmailBeenSent("test@example.com", "测试邮件")
      );

      // 测试失败情况
      emailStub.setShouldFail(true);
      const failResult = await this.emailService.sendEmail(
        "fail@example.com",
        "失败测试",
        "这应该失败"
      );
      console.log("✓ 模拟失败:", failResult);

      emailStub.setShouldFail(false);
    }
  }

  /**
   * 演示支付服务
   */
  private async demonstratePaymentService(): Promise<void> {
    console.log("\n2. 支付服务测试:");

    // 成功支付
    const paymentResult = await this.paymentService.processPayment(
      100.0,
      "CNY",
      {
        type: "credit_card",
        details: {
          cardNumber: "4111111111111111",
          expiryDate: "12/25",
          cvv: "123",
        },
      }
    );
    console.log("✓ 处理支付:", paymentResult);

    // 支付状态查询
    if (paymentResult.success && paymentResult.transactionId) {
      const status = await this.paymentService.getPaymentStatus(
        paymentResult.transactionId
      );
      console.log("✓ 支付状态:", status);

      // 退款
      const refundResult = await this.paymentService.refundPayment(
        paymentResult.transactionId,
        50.0
      );
      console.log("✓ 处理退款:", refundResult);
    }

    // 如果是服务桩，显示测试统计
    if (this.paymentService instanceof PaymentServiceStub) {
      const paymentStub = this.paymentService as PaymentServiceStub;
      console.log("✓ 交易总数:", paymentStub.getTransactionCount());
      console.log(
        "✓ 成功交易总金额:",
        paymentStub.getSuccessfulTransactionAmount()
      );

      // 测试失败情况
      paymentStub.setShouldFail(true);
      const failResult = await this.paymentService.processPayment(
        200.0,
        "CNY",
        {
          type: "credit_card",
          details: {
            cardNumber: "4111111111111111",
            expiryDate: "12/25",
            cvv: "123",
          },
        }
      );
      console.log("✓ 模拟支付失败:", failResult);

      paymentStub.setShouldFail(false);
    }
  }

  /**
   * 演示外部API服务
   */
  private async demonstrateExternalApiService(): Promise<void> {
    console.log("\n3. 外部API服务测试:");

    // 获取用户资料
    const userProfile = await this.externalApiService.getUserProfile("user1");
    console.log("✓ 用户资料:", userProfile ? userProfile.fullName : "未找到");

    // 更新用户资料
    if (userProfile) {
      const updateResult = await this.externalApiService.updateUserProfile(
        "user1",
        {
          bio: "更新后的个人简介",
        }
      );
      console.log("✓ 更新用户资料:", updateResult);
    }

    // 获取天气信息
    const weather = await this.externalApiService.getWeatherInfo("北京");
    console.log(
      "✓ 天气信息:",
      weather ? `${weather.temperature}°C, ${weather.description}` : "未找到"
    );

    // 文本翻译
    const translation = await this.externalApiService.translateText(
      "Hello",
      "zh"
    );
    console.log("✓ 翻译结果:", translation);

    // 如果是服务桩，测试失败情况
    if (this.externalApiService instanceof ExternalApiServiceStub) {
      const apiStub = this.externalApiService as ExternalApiServiceStub;
      apiStub.setShouldFail(true);

      try {
        await this.externalApiService.getWeatherInfo("上海");
      } catch (error) {
        console.log("✓ 模拟API失败:", (error as Error).message);
      }

      apiStub.setShouldFail(false);
    }
  }

  private printServiceStubGuidelines(): void {
    console.log(`
Service Stub模式使用指南：

设计原则：
- 实现与真实服务相同的接口
- 提供可预测的行为
- 支持测试场景控制
- 记录调用历史

主要特点：
- 替代真实服务进行测试
- 提供快速、可控的响应
- 支持失败场景模拟
- 隔离外部依赖

优点：
- 提高测试速度
- 消除外部依赖
- 便于测试控制
- 支持离线测试

使用场景：
- 单元测试
- 集成测试
- 外部服务不可用时
- 需要模拟特定行为

实现技巧：
- 使用内存存储模拟数据
- 提供测试辅助方法
- 支持失败场景模拟
- 记录服务调用历史

最佳实践：
- 保持与真实服务接口一致
- 提供合理的默认行为
- 支持测试数据配置
- 实现完整的错误处理
- 提供详细的调用统计

注意事项：
- 及时更新以匹配真实服务
- 避免过度复杂化
- 确保测试数据的合理性
- 考虑性能影响
    `);
  }
}
