/**
 * Gateway（网关）模式
 *
 * 为访问外部系统或资源封装接口。
 * 这个模式通过提供简化的接口来隐藏复杂的外部系统交互。
 *
 * 优点：
 * - 简化外部系统访问
 * - 封装复杂的协议和格式转换
 * - 提供统一的错误处理
 * - 便于单元测试（可以Mock）
 *
 * 使用场景：
 * - 访问外部Web服务时
 * - 与遗留系统集成时
 * - 需要协议转换时
 * - 需要统一错误处理时
 */

import axios, { AxiosInstance, AxiosResponse } from "axios";
import { Logger } from "./separated-interface";

/**
 * 抽象网关基类
 * 为所有网关提供通用功能
 */
export abstract class Gateway {
  protected client: AxiosInstance;
  protected logger: Logger;
  protected baseUrl: string;
  protected timeout: number;

  constructor(baseUrl: string, logger: Logger, timeout: number = 30000) {
    this.baseUrl = baseUrl;
    this.logger = logger;
    this.timeout = timeout;
    this.client = this.createHttpClient();
  }

  /**
   * 创建HTTP客户端
   */
  private createHttpClient(): AxiosInstance {
    const client = axios.create({
      baseURL: this.baseUrl,
      timeout: this.timeout,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });

    // 请求拦截器
    client.interceptors.request.use(
      (config) => {
        this.logger.info(
          `发送请求: ${config.method?.toUpperCase()} ${config.url}`,
          {
            headers: config.headers,
            data: config.data,
          }
        );
        return config;
      },
      (error) => {
        this.logger.error("请求拦截器错误", error);
        return Promise.reject(error);
      }
    );

    // 响应拦截器
    client.interceptors.response.use(
      (response) => {
        this.logger.info(
          `收到响应: ${response.status} ${response.config.url}`,
          {
            status: response.status,
            data: response.data,
          }
        );
        return response;
      },
      (error) => {
        this.logger.error("响应拦截器错误", error, {
          url: error.config?.url,
          status: error.response?.status,
          data: error.response?.data,
        });
        return Promise.reject(this.handleError(error));
      }
    );

    return client;
  }

  /**
   * 统一错误处理
   */
  protected handleError(error: any): Error {
    if (error.response) {
      // 服务器响应了错误状态码
      const message = `HTTP ${error.response.status}: ${
        error.response.data?.message || error.message
      }`;
      return new Error(message);
    } else if (error.request) {
      // 请求发出但没有收到响应
      return new Error("网络错误：无法连接到服务器");
    } else {
      // 其他错误
      return new Error(`请求配置错误: ${error.message}`);
    }
  }

  /**
   * 通用GET请求
   */
  protected async get<T>(path: string, params?: any): Promise<T> {
    try {
      const response: AxiosResponse<T> = await this.client.get(path, {
        params,
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * 通用POST请求
   */
  protected async post<T>(path: string, data?: any): Promise<T> {
    try {
      const response: AxiosResponse<T> = await this.client.post(path, data);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * 通用PUT请求
   */
  protected async put<T>(path: string, data?: any): Promise<T> {
    try {
      const response: AxiosResponse<T> = await this.client.put(path, data);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * 通用DELETE请求
   */
  protected async delete<T>(path: string): Promise<T> {
    try {
      const response: AxiosResponse<T> = await this.client.delete(path);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }
}

/**
 * 支付网关
 * 封装与外部支付服务的交互
 */
export class PaymentGateway extends Gateway {
  private apiKey: string;

  constructor(baseUrl: string, apiKey: string, logger: Logger) {
    super(baseUrl, logger);
    this.apiKey = apiKey;
    this.setupAuthentication();
  }

  /**
   * 设置认证
   */
  private setupAuthentication(): void {
    this.client.defaults.headers.common[
      "Authorization"
    ] = `Bearer ${this.apiKey}`;
  }

  /**
   * 处理支付
   */
  async processPayment(paymentData: PaymentRequest): Promise<PaymentResponse> {
    this.logger.info("处理支付请求", {
      orderId: paymentData.orderId,
      amount: paymentData.amount,
    });

    try {
      const response = await this.post<PaymentResponse>("/payments", {
        amount: paymentData.amount,
        currency: paymentData.currency,
        payment_method: this.mapPaymentMethod(paymentData.paymentMethod),
        order_id: paymentData.orderId,
        description: `订单 ${paymentData.orderId} 的支付`,
      });

      this.logger.info("支付处理成功", {
        transactionId: response.transactionId,
      });
      return response;
    } catch (error) {
      this.logger.error("支付处理失败", error as Error, {
        orderId: paymentData.orderId,
      });
      throw error;
    }
  }

  /**
   * 退款
   */
  async refundPayment(
    transactionId: string,
    amount: number
  ): Promise<RefundResponse> {
    this.logger.info("处理退款请求", { transactionId, amount });

    try {
      const response = await this.post<RefundResponse>(
        `/payments/${transactionId}/refund`,
        {
          amount: amount,
        }
      );

      this.logger.info("退款处理成功", { refundId: response.refundId });
      return response;
    } catch (error) {
      this.logger.error("退款处理失败", error as Error, { transactionId });
      throw error;
    }
  }

  /**
   * 查询交易状态
   */
  async getTransactionStatus(
    transactionId: string
  ): Promise<TransactionStatusResponse> {
    try {
      return await this.get<TransactionStatusResponse>(
        `/payments/${transactionId}`
      );
    } catch (error) {
      this.logger.error("查询交易状态失败", error as Error, { transactionId });
      throw error;
    }
  }

  /**
   * 映射支付方式
   */
  private mapPaymentMethod(method: string): string {
    const mapping: { [key: string]: string } = {
      credit_card: "card",
      alipay: "alipay",
      wechat_pay: "wechat",
      bank_transfer: "bank_transfer",
    };
    return mapping[method] || method;
  }
}

/**
 * 库存服务网关
 * 封装与外部库存管理系统的交互
 */
export class InventoryGateway extends Gateway {
  constructor(baseUrl: string, logger: Logger) {
    super(baseUrl, logger);
  }

  /**
   * 检查库存
   */
  async checkStock(productId: string): Promise<StockInfo> {
    try {
      return await this.get<StockInfo>(`/inventory/${productId}`);
    } catch (error) {
      this.logger.error("检查库存失败", error as Error, { productId });
      throw error;
    }
  }

  /**
   * 预留库存
   */
  async reserveStock(
    productId: string,
    quantity: number
  ): Promise<ReservationResponse> {
    this.logger.info("预留库存", { productId, quantity });

    try {
      const response = await this.post<ReservationResponse>(
        "/inventory/reserve",
        {
          product_id: productId,
          quantity: quantity,
          expires_at: new Date(Date.now() + 15 * 60 * 1000), // 15分钟后过期
        }
      );

      this.logger.info("库存预留成功", {
        reservationId: response.reservationId,
      });
      return response;
    } catch (error) {
      this.logger.error("库存预留失败", error as Error, {
        productId,
        quantity,
      });
      throw error;
    }
  }

  /**
   * 释放预留
   */
  async releaseReservation(reservationId: string): Promise<void> {
    try {
      await this.delete(`/inventory/reservations/${reservationId}`);
      this.logger.info("释放预留成功", { reservationId });
    } catch (error) {
      this.logger.error("释放预留失败", error as Error, { reservationId });
      throw error;
    }
  }

  /**
   * 确认使用库存
   */
  async confirmUsage(reservationId: string): Promise<void> {
    try {
      await this.put(`/inventory/reservations/${reservationId}/confirm`, {});
      this.logger.info("确认使用库存成功", { reservationId });
    } catch (error) {
      this.logger.error("确认使用库存失败", error as Error, { reservationId });
      throw error;
    }
  }
}

/**
 * 通知服务网关
 * 封装与外部通知服务的交互
 */
export class NotificationGateway extends Gateway {
  constructor(baseUrl: string, logger: Logger) {
    super(baseUrl, logger);
  }

  /**
   * 发送邮件
   */
  async sendEmail(emailData: EmailRequest): Promise<void> {
    this.logger.info("发送邮件", {
      to: emailData.to,
      subject: emailData.subject,
    });

    try {
      await this.post("/notifications/email", {
        to: emailData.to,
        subject: emailData.subject,
        body: emailData.body,
        template: emailData.template,
        variables: emailData.variables,
      });

      this.logger.info("邮件发送成功", { to: emailData.to });
    } catch (error) {
      this.logger.error("邮件发送失败", error as Error, { to: emailData.to });
      throw error;
    }
  }

  /**
   * 发送短信
   */
  async sendSMS(smsData: SMSRequest): Promise<void> {
    this.logger.info("发送短信", { to: smsData.to });

    try {
      await this.post("/notifications/sms", {
        to: smsData.to,
        message: smsData.message,
      });

      this.logger.info("短信发送成功", { to: smsData.to });
    } catch (error) {
      this.logger.error("短信发送失败", error as Error, { to: smsData.to });
      throw error;
    }
  }

  /**
   * 发送推送通知
   */
  async sendPushNotification(pushData: PushNotificationRequest): Promise<void> {
    this.logger.info("发送推送通知", { userId: pushData.userId });

    try {
      await this.post("/notifications/push", {
        user_id: pushData.userId,
        title: pushData.title,
        body: pushData.body,
        data: pushData.data,
      });

      this.logger.info("推送通知发送成功", { userId: pushData.userId });
    } catch (error) {
      this.logger.error("推送通知发送失败", error as Error, {
        userId: pushData.userId,
      });
      throw error;
    }
  }
}

// ============================================================================
// 数据传输对象
// ============================================================================

export interface PaymentRequest {
  orderId: string;
  amount: number;
  currency: string;
  paymentMethod: string;
}

export interface PaymentResponse {
  success: boolean;
  transactionId: string;
  status: string;
  message?: string;
}

export interface RefundResponse {
  success: boolean;
  refundId: string;
  status: string;
  message?: string;
}

export interface TransactionStatusResponse {
  transactionId: string;
  status: string;
  amount: number;
  currency: string;
  createdAt: string;
  updatedAt: string;
}

export interface StockInfo {
  productId: string;
  availableQuantity: number;
  reservedQuantity: number;
  lastUpdated: string;
}

export interface ReservationResponse {
  reservationId: string;
  productId: string;
  quantity: number;
  expiresAt: string;
}

export interface EmailRequest {
  to: string;
  subject: string;
  body: string;
  template?: string;
  variables?: { [key: string]: any };
}

export interface SMSRequest {
  to: string;
  message: string;
}

export interface PushNotificationRequest {
  userId: string;
  title: string;
  body: string;
  data?: { [key: string]: any };
}
