/**
 * 外部服务网关 (External Service Gateway) 实现
 *
 * Gateway模式为外部系统提供一个统一的访问接口，
 * 封装了与外部服务的复杂交互逻辑，提供简化的接口给内部系统使用。
 *
 * 主要特点：
 * - 封装外部服务的复杂性
 * - 提供统一的错误处理
 * - 支持重试和熔断机制
 * - 便于mock和测试
 * - 处理数据格式转换
 */

import axios, { AxiosInstance, AxiosRequestConfig } from "axios";

// ======================== 基础网关接口 ========================

/**
 * 外部服务网关基础接口
 */
export interface ExternalServiceGateway {
  isHealthy(): Promise<boolean>;
  getServiceName(): string;
  getServiceVersion(): string;
}

/**
 * 网关响应接口
 */
export interface GatewayResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  statusCode?: number;
  requestId?: string;
}

/**
 * 重试配置接口
 */
export interface RetryConfig {
  maxRetries: number;
  retryDelay: number;
  backoffMultiplier: number;
  retryableStatusCodes: number[];
}

// ======================== 支付网关 (Payment Gateway) ========================

/**
 * 支付请求接口
 */
export interface PaymentRequest {
  orderId: string;
  amount: number;
  currency: string;
  paymentMethod: "credit_card" | "alipay" | "wechat_pay" | "bank_transfer";
  customerInfo: {
    id: string;
    email: string;
    name: string;
  };
  billingAddress?: {
    country: string;
    state: string;
    city: string;
    street: string;
    postalCode: string;
  };
  cardInfo?: {
    number: string;
    expiryMonth: number;
    expiryYear: number;
    cvv: string;
  };
  returnUrl?: string;
  webhookUrl?: string;
}

/**
 * 支付响应接口
 */
export interface PaymentResponse {
  transactionId: string;
  status: "pending" | "processing" | "completed" | "failed" | "cancelled";
  amount: number;
  currency: string;
  fees?: number;
  gatewayTransactionId?: string;
  redirectUrl?: string;
  message?: string;
  timestamp: Date;
}

/**
 * 支付网关实现
 */
export class PaymentGateway implements ExternalServiceGateway {
  private readonly httpClient: AxiosInstance;
  private readonly apiKey: string;
  private readonly baseURL: string;
  private readonly retryConfig: RetryConfig;

  constructor(
    apiKey: string,
    baseURL: string,
    retryConfig?: Partial<RetryConfig>
  ) {
    this.apiKey = apiKey;
    this.baseURL = baseURL;
    this.retryConfig = {
      maxRetries: 3,
      retryDelay: 1000,
      backoffMultiplier: 2,
      retryableStatusCodes: [500, 502, 503, 504, 408],
      ...retryConfig,
    };

    this.httpClient = axios.create({
      baseURL: this.baseURL,
      timeout: 30000,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
        "User-Agent": "Enterprise-Architecture-Patterns/1.0",
      },
    });

    this.setupInterceptors();
  }

  /**
   * 处理支付请求
   */
  async processPayment(
    request: PaymentRequest
  ): Promise<GatewayResponse<PaymentResponse>> {
    try {
      const response = await this.httpClient.post("/payments", {
        order_id: request.orderId,
        amount: Math.round(request.amount * 100), // 转换为分
        currency: request.currency,
        payment_method: request.paymentMethod,
        customer: {
          id: request.customerInfo.id,
          email: request.customerInfo.email,
          name: request.customerInfo.name,
        },
        billing_address: request.billingAddress,
        card: request.cardInfo,
        return_url: request.returnUrl,
        webhook_url: request.webhookUrl,
        metadata: {
          source: "enterprise-architecture-patterns",
          timestamp: new Date().toISOString(),
        },
      });

      const paymentData = response.data;

      return {
        success: true,
        data: {
          transactionId: paymentData.id,
          status: this.mapPaymentStatus(paymentData.status),
          amount: paymentData.amount / 100, // 转换回元
          currency: paymentData.currency,
          fees: paymentData.fees ? paymentData.fees / 100 : undefined,
          gatewayTransactionId: paymentData.gateway_transaction_id,
          redirectUrl: paymentData.redirect_url,
          message: paymentData.message,
          timestamp: new Date(paymentData.created_at),
        },
        statusCode: response.status,
        requestId: response.headers["x-request-id"],
      };
    } catch (error: any) {
      return this.handleError(error, "processPayment");
    }
  }

  /**
   * 查询支付状态
   */
  async getPaymentStatus(
    transactionId: string
  ): Promise<GatewayResponse<PaymentResponse>> {
    try {
      const response = await this.httpClient.get(`/payments/${transactionId}`);
      const paymentData = response.data;

      return {
        success: true,
        data: {
          transactionId: paymentData.id,
          status: this.mapPaymentStatus(paymentData.status),
          amount: paymentData.amount / 100,
          currency: paymentData.currency,
          fees: paymentData.fees ? paymentData.fees / 100 : undefined,
          gatewayTransactionId: paymentData.gateway_transaction_id,
          message: paymentData.message,
          timestamp: new Date(paymentData.updated_at),
        },
        statusCode: response.status,
        requestId: response.headers["x-request-id"],
      };
    } catch (error: any) {
      return this.handleError(error, "getPaymentStatus");
    }
  }

  /**
   * 退款
   */
  async refundPayment(
    transactionId: string,
    amount?: number,
    reason?: string
  ): Promise<GatewayResponse<any>> {
    try {
      const response = await this.httpClient.post(
        `/payments/${transactionId}/refund`,
        {
          amount: amount ? Math.round(amount * 100) : undefined,
          reason: reason || "Customer request",
          metadata: {
            refund_source: "enterprise-architecture-patterns",
            timestamp: new Date().toISOString(),
          },
        }
      );

      return {
        success: true,
        data: response.data,
        statusCode: response.status,
        requestId: response.headers["x-request-id"],
      };
    } catch (error: any) {
      return this.handleError(error, "refundPayment");
    }
  }

  async isHealthy(): Promise<boolean> {
    try {
      const response = await this.httpClient.get("/health");
      return response.status === 200;
    } catch {
      return false;
    }
  }

  getServiceName(): string {
    return "PaymentGateway";
  }

  getServiceVersion(): string {
    return "1.0.0";
  }

  private mapPaymentStatus(gatewayStatus: string): PaymentResponse["status"] {
    const statusMap: Record<string, PaymentResponse["status"]> = {
      created: "pending",
      pending: "pending",
      processing: "processing",
      succeeded: "completed",
      failed: "failed",
      cancelled: "cancelled",
      refunded: "cancelled",
    };

    return statusMap[gatewayStatus] || "pending";
  }

  private setupInterceptors() {
    // 请求拦截器
    this.httpClient.interceptors.request.use((config) => {
      config.headers["X-Request-ID"] = this.generateRequestId();
      config.headers["X-Timestamp"] = new Date().toISOString();
      return config;
    });

    // 响应拦截器 - 添加重试逻辑
    this.httpClient.interceptors.response.use(
      (response) => response,
      async (error) => {
        const config = error.config;

        if (!config._retryCount) {
          config._retryCount = 0;
        }

        if (
          config._retryCount < this.retryConfig.maxRetries &&
          this.shouldRetry(error)
        ) {
          config._retryCount++;

          const delay =
            this.retryConfig.retryDelay *
            Math.pow(
              this.retryConfig.backoffMultiplier,
              config._retryCount - 1
            );

          await this.sleep(delay);
          return this.httpClient(config);
        }

        return Promise.reject(error);
      }
    );
  }

  private shouldRetry(error: any): boolean {
    return (
      error.code === "ENOTFOUND" ||
      error.code === "ECONNRESET" ||
      error.code === "ETIMEDOUT" ||
      (error.response &&
        this.retryConfig.retryableStatusCodes.includes(error.response.status))
    );
  }

  private generateRequestId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private handleError(error: any, operation: string): GatewayResponse {
    console.error(`PaymentGateway.${operation} error:`, error);

    if (error.response) {
      return {
        success: false,
        error: error.response.data?.message || "Payment gateway error",
        statusCode: error.response.status,
        requestId: error.response.headers?.["x-request-id"],
      };
    } else if (error.request) {
      return {
        success: false,
        error: "Network error: Unable to reach payment gateway",
        statusCode: 503,
      };
    } else {
      return {
        success: false,
        error: `Payment processing error: ${error.message}`,
        statusCode: 500,
      };
    }
  }
}

// ======================== 短信服务网关 (SMS Gateway) ========================

export interface SMSRequest {
  to: string;
  message: string;
  template?: string;
  templateParams?: Record<string, string>;
  senderId?: string;
}

export interface SMSResponse {
  messageId: string;
  status: "sent" | "delivered" | "failed";
  cost?: number;
  timestamp: Date;
}

export class SMSGateway implements ExternalServiceGateway {
  private readonly httpClient: AxiosInstance;
  private readonly apiKey: string;
  private readonly senderId: string;

  constructor(apiKey: string, baseURL: string, senderId: string = "EAAP") {
    this.apiKey = apiKey;
    this.senderId = senderId;

    this.httpClient = axios.create({
      baseURL,
      timeout: 10000,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
    });
  }

  async sendSMS(request: SMSRequest): Promise<GatewayResponse<SMSResponse>> {
    try {
      const response = await this.httpClient.post("/sms/send", {
        to: request.to,
        message: request.message,
        template: request.template,
        template_params: request.templateParams,
        sender_id: request.senderId || this.senderId,
      });

      return {
        success: true,
        data: {
          messageId: response.data.message_id,
          status: response.data.status,
          cost: response.data.cost,
          timestamp: new Date(response.data.timestamp),
        },
        statusCode: response.status,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || "SMS sending failed",
        statusCode: error.response?.status || 500,
      };
    }
  }

  async getSMSStatus(messageId: string): Promise<GatewayResponse<SMSResponse>> {
    try {
      const response = await this.httpClient.get(`/sms/status/${messageId}`);

      return {
        success: true,
        data: {
          messageId: response.data.message_id,
          status: response.data.status,
          timestamp: new Date(response.data.updated_at),
        },
        statusCode: response.status,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || "Failed to get SMS status",
        statusCode: error.response?.status || 500,
      };
    }
  }

  async isHealthy(): Promise<boolean> {
    try {
      const response = await this.httpClient.get("/health");
      return response.status === 200;
    } catch {
      return false;
    }
  }

  getServiceName(): string {
    return "SMSGateway";
  }

  getServiceVersion(): string {
    return "1.0.0";
  }
}

// ======================== 邮件服务网关 (Email Gateway) ========================

export interface EmailRequest {
  to: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  subject: string;
  htmlBody?: string;
  textBody?: string;
  template?: string;
  templateParams?: Record<string, any>;
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
    contentType?: string;
  }>;
}

export interface EmailResponse {
  messageId: string;
  status: "queued" | "sent" | "delivered" | "failed" | "bounced";
  timestamp: Date;
}

export class EmailGateway implements ExternalServiceGateway {
  private readonly httpClient: AxiosInstance;
  private readonly apiKey: string;
  private readonly fromEmail: string;

  constructor(apiKey: string, baseURL: string, fromEmail: string) {
    this.apiKey = apiKey;
    this.fromEmail = fromEmail;

    this.httpClient = axios.create({
      baseURL,
      timeout: 30000,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
    });
  }

  async sendEmail(
    request: EmailRequest
  ): Promise<GatewayResponse<EmailResponse>> {
    try {
      const emailData: any = {
        from: this.fromEmail,
        to: Array.isArray(request.to) ? request.to : [request.to],
        subject: request.subject,
      };

      if (request.cc) {
        emailData.cc = Array.isArray(request.cc) ? request.cc : [request.cc];
      }

      if (request.bcc) {
        emailData.bcc = Array.isArray(request.bcc)
          ? request.bcc
          : [request.bcc];
      }

      if (request.template) {
        emailData.template = request.template;
        emailData.template_params = request.templateParams;
      } else {
        if (request.htmlBody) emailData.html = request.htmlBody;
        if (request.textBody) emailData.text = request.textBody;
      }

      if (request.attachments) {
        emailData.attachments = request.attachments.map((att) => ({
          filename: att.filename,
          content: Buffer.isBuffer(att.content)
            ? att.content.toString("base64")
            : Buffer.from(att.content).toString("base64"),
          content_type: att.contentType || "application/octet-stream",
        }));
      }

      const response = await this.httpClient.post("/email/send", emailData);

      return {
        success: true,
        data: {
          messageId: response.data.message_id,
          status: response.data.status,
          timestamp: new Date(response.data.timestamp),
        },
        statusCode: response.status,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || "Email sending failed",
        statusCode: error.response?.status || 500,
      };
    }
  }

  async getEmailStatus(
    messageId: string
  ): Promise<GatewayResponse<EmailResponse>> {
    try {
      const response = await this.httpClient.get(`/email/status/${messageId}`);

      return {
        success: true,
        data: {
          messageId: response.data.message_id,
          status: response.data.status,
          timestamp: new Date(response.data.updated_at),
        },
        statusCode: response.status,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || "Failed to get email status",
        statusCode: error.response?.status || 500,
      };
    }
  }

  async isHealthy(): Promise<boolean> {
    try {
      const response = await this.httpClient.get("/health");
      return response.status === 200;
    } catch {
      return false;
    }
  }

  getServiceName(): string {
    return "EmailGateway";
  }

  getServiceVersion(): string {
    return "1.0.0";
  }
}

// ======================== 文件存储网关 (File Storage Gateway) ========================

export interface FileUploadRequest {
  file: Buffer;
  filename: string;
  contentType?: string;
  folder?: string;
  isPublic?: boolean;
  metadata?: Record<string, string>;
}

export interface FileUploadResponse {
  fileId: string;
  url: string;
  publicUrl?: string;
  size: number;
  contentType: string;
  timestamp: Date;
}

export class FileStorageGateway implements ExternalServiceGateway {
  private readonly httpClient: AxiosInstance;
  private readonly apiKey: string;
  private readonly bucketName: string;

  constructor(apiKey: string, baseURL: string, bucketName: string) {
    this.apiKey = apiKey;
    this.bucketName = bucketName;

    this.httpClient = axios.create({
      baseURL,
      timeout: 60000, // 文件上传需要更长时间
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
      },
    });
  }

  async uploadFile(
    request: FileUploadRequest
  ): Promise<GatewayResponse<FileUploadResponse>> {
    try {
      const formData = new FormData();
      formData.append("file", new Blob([request.file]), request.filename);
      formData.append("bucket", this.bucketName);

      if (request.folder) {
        formData.append("folder", request.folder);
      }

      if (request.contentType) {
        formData.append("content_type", request.contentType);
      }

      formData.append("is_public", request.isPublic ? "true" : "false");

      if (request.metadata) {
        formData.append("metadata", JSON.stringify(request.metadata));
      }

      const response = await this.httpClient.post("/files/upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      return {
        success: true,
        data: {
          fileId: response.data.file_id,
          url: response.data.url,
          publicUrl: response.data.public_url,
          size: response.data.size,
          contentType: response.data.content_type,
          timestamp: new Date(response.data.uploaded_at),
        },
        statusCode: response.status,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || "File upload failed",
        statusCode: error.response?.status || 500,
      };
    }
  }

  async deleteFile(fileId: string): Promise<GatewayResponse<void>> {
    try {
      await this.httpClient.delete(`/files/${fileId}`);

      return {
        success: true,
        statusCode: 204,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || "File deletion failed",
        statusCode: error.response?.status || 500,
      };
    }
  }

  async isHealthy(): Promise<boolean> {
    try {
      const response = await this.httpClient.get("/health");
      return response.status === 200;
    } catch {
      return false;
    }
  }

  getServiceName(): string {
    return "FileStorageGateway";
  }

  getServiceVersion(): string {
    return "1.0.0";
  }
}

// ======================== 网关管理器 ========================

/**
 * 外部服务网关管理器
 * 统一管理所有外部服务网关，提供健康检查、监控等功能
 */
export class ExternalServiceGatewayManager {
  private readonly gateways: Map<string, ExternalServiceGateway> = new Map();
  private healthCheckInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.startHealthCheck();
  }

  /**
   * 注册网关
   */
  registerGateway(name: string, gateway: ExternalServiceGateway): void {
    this.gateways.set(name, gateway);
    console.log(
      `Registered gateway: ${name} (${gateway.getServiceName()} v${gateway.getServiceVersion()})`
    );
  }

  /**
   * 获取网关
   */
  getGateway<T extends ExternalServiceGateway>(name: string): T | undefined {
    return this.gateways.get(name) as T;
  }

  /**
   * 检查所有网关健康状态
   */
  async checkAllGatewaysHealth(): Promise<Record<string, boolean>> {
    const healthStatus: Record<string, boolean> = {};

    for (const [name, gateway] of this.gateways.entries()) {
      try {
        healthStatus[name] = await gateway.isHealthy();
      } catch (error) {
        console.error(`Health check failed for gateway ${name}:`, error);
        healthStatus[name] = false;
      }
    }

    return healthStatus;
  }

  /**
   * 获取网关列表
   */
  getGatewayList(): Array<{
    name: string;
    serviceName: string;
    version: string;
  }> {
    return Array.from(this.gateways.entries()).map(([name, gateway]) => ({
      name,
      serviceName: gateway.getServiceName(),
      version: gateway.getServiceVersion(),
    }));
  }

  /**
   * 启动健康检查
   */
  private startHealthCheck(): void {
    this.healthCheckInterval = setInterval(async () => {
      const healthStatus = await this.checkAllGatewaysHealth();
      console.log("Gateway health status:", healthStatus);
    }, 60000); // 每分钟检查一次
  }

  /**
   * 停止健康检查
   */
  destroy(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
    this.gateways.clear();
  }
}

// ======================== 使用示例 ========================

/**
 * 外部服务网关使用示例
 */
export class ExternalServiceExample {
  private readonly gatewayManager: ExternalServiceGatewayManager;

  constructor() {
    this.gatewayManager = new ExternalServiceGatewayManager();
    this.setupGateways();
  }

  private setupGateways(): void {
    // 设置支付网关
    const paymentGateway = new PaymentGateway(
      process.env.PAYMENT_API_KEY || "test-key",
      process.env.PAYMENT_API_URL || "https://api.payment-provider.com"
    );
    this.gatewayManager.registerGateway("payment", paymentGateway);

    // 设置短信网关
    const smsGateway = new SMSGateway(
      process.env.SMS_API_KEY || "test-key",
      process.env.SMS_API_URL || "https://api.sms-provider.com"
    );
    this.gatewayManager.registerGateway("sms", smsGateway);

    // 设置邮件网关
    const emailGateway = new EmailGateway(
      process.env.EMAIL_API_KEY || "test-key",
      process.env.EMAIL_API_URL || "https://api.email-provider.com",
      process.env.FROM_EMAIL || "noreply@enterprise-patterns.com"
    );
    this.gatewayManager.registerGateway("email", emailGateway);
  }

  /**
   * 演示支付流程
   */
  async demonstratePaymentFlow(): Promise<void> {
    const paymentGateway =
      this.gatewayManager.getGateway<PaymentGateway>("payment");

    if (!paymentGateway) {
      console.error("Payment gateway not available");
      return;
    }

    console.log("=== 支付流程演示 ===");

    // 1. 创建支付请求
    const paymentRequest: PaymentRequest = {
      orderId: "ORDER-" + Date.now(),
      amount: 99.99,
      currency: "CNY",
      paymentMethod: "alipay",
      customerInfo: {
        id: "customer-123",
        email: "customer@example.com",
        name: "张三",
      },
    };

    // 2. 处理支付
    const paymentResult = await paymentGateway.processPayment(paymentRequest);

    if (paymentResult.success && paymentResult.data) {
      console.log("支付创建成功:", paymentResult.data.transactionId);

      // 3. 查询支付状态
      const statusResult = await paymentGateway.getPaymentStatus(
        paymentResult.data.transactionId
      );
      console.log("支付状态:", statusResult.data?.status);
    } else {
      console.error("支付失败:", paymentResult.error);
    }
  }

  /**
   * 演示通知发送
   */
  async demonstrateNotificationFlow(): Promise<void> {
    console.log("=== 通知发送演示 ===");

    // 发送短信
    const smsGateway = this.gatewayManager.getGateway<SMSGateway>("sms");
    if (smsGateway) {
      const smsResult = await smsGateway.sendSMS({
        to: "+8613800138000",
        message: "您的订单已确认，感谢您的购买！",
      });
      console.log(
        "短信发送结果:",
        smsResult.success ? "成功" : smsResult.error
      );
    }

    // 发送邮件
    const emailGateway = this.gatewayManager.getGateway<EmailGateway>("email");
    if (emailGateway) {
      const emailResult = await emailGateway.sendEmail({
        to: "customer@example.com",
        subject: "订单确认通知",
        htmlBody:
          "<h1>感谢您的购买！</h1><p>您的订单已经确认，我们将尽快为您发货。</p>",
        textBody: "感谢您的购买！您的订单已经确认，我们将尽快为您发货。",
      });
      console.log(
        "邮件发送结果:",
        emailResult.success ? "成功" : emailResult.error
      );
    }
  }

  /**
   * 获取所有网关状态
   */
  async getGatewayStatus(): Promise<void> {
    console.log("=== 网关状态检查 ===");

    const healthStatus = await this.gatewayManager.checkAllGatewaysHealth();
    console.log("网关健康状态:", healthStatus);

    const gatewayList = this.gatewayManager.getGatewayList();
    console.log("已注册的网关:", gatewayList);
  }
}

export default {
  PaymentGateway,
  SMSGateway,
  EmailGateway,
  FileStorageGateway,
  ExternalServiceGatewayManager,
  ExternalServiceExample,
};
