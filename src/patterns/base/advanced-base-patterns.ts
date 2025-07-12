/**
 * 高级基础模式 (Advanced Base Patterns)
 *
 * 包含企业应用中的核心基础模式：
 * 1. Record Set - 记录集模式
 * 2. Special Case - 特殊情况模式
 * 3. Money - 金额模式（增强版）
 * 4. Quantity - 数量模式
 * 5. Range - 范围模式
 */

// ============================================================================
// 1. Record Set - 记录集模式
// ============================================================================

/**
 * 记录集接口
 *
 * 表示一组相关的数据记录，提供统一的访问和操作接口
 * 支持内存操作、排序、过滤、分组等功能
 */
interface IRecordSet<T> {
  // 基本操作
  size(): number;
  isEmpty(): boolean;
  contains(record: T): boolean;

  // 访问操作
  get(index: number): T | null;
  first(): T | null;
  last(): T | null;
  toArray(): T[];

  // 修改操作
  add(record: T): void;
  remove(record: T): boolean;
  removeAt(index: number): T | null;
  clear(): void;

  // 查询操作
  filter(predicate: (record: T) => boolean): IRecordSet<T>;
  find(predicate: (record: T) => boolean): T | null;
  sort(compareFn: (a: T, b: T) => number): IRecordSet<T>;

  // 聚合操作
  groupBy<K>(keySelector: (record: T) => K): Map<K, IRecordSet<T>>;
  reduce<R>(reducer: (acc: R, record: T) => R, initialValue: R): R;

  // 迭代器
  [Symbol.iterator](): Iterator<T>;
}

/**
 * 基础记录集实现
 */
class RecordSet<T> implements IRecordSet<T> {
  private records: T[] = [];

  constructor(records: T[] = []) {
    this.records = [...records];
  }

  size(): number {
    return this.records.length;
  }

  isEmpty(): boolean {
    return this.records.length === 0;
  }

  contains(record: T): boolean {
    return this.records.includes(record);
  }

  get(index: number): T | null {
    if (index < 0 || index >= this.records.length) {
      return null;
    }
    return this.records[index];
  }

  first(): T | null {
    return this.records.length > 0 ? this.records[0] : null;
  }

  last(): T | null {
    return this.records.length > 0
      ? this.records[this.records.length - 1]
      : null;
  }

  toArray(): T[] {
    return [...this.records];
  }

  add(record: T): void {
    this.records.push(record);
  }

  remove(record: T): boolean {
    const index = this.records.indexOf(record);
    if (index !== -1) {
      this.records.splice(index, 1);
      return true;
    }
    return false;
  }

  removeAt(index: number): T | null {
    if (index < 0 || index >= this.records.length) {
      return null;
    }
    return this.records.splice(index, 1)[0];
  }

  clear(): void {
    this.records = [];
  }

  filter(predicate: (record: T) => boolean): IRecordSet<T> {
    return new RecordSet(this.records.filter(predicate));
  }

  find(predicate: (record: T) => boolean): T | null {
    return this.records.find(predicate) || null;
  }

  sort(compareFn: (a: T, b: T) => number): IRecordSet<T> {
    const sortedRecords = [...this.records].sort(compareFn);
    return new RecordSet(sortedRecords);
  }

  groupBy<K>(keySelector: (record: T) => K): Map<K, IRecordSet<T>> {
    const groups = new Map<K, IRecordSet<T>>();

    for (const record of this.records) {
      const key = keySelector(record);
      if (!groups.has(key)) {
        groups.set(key, new RecordSet<T>());
      }
      groups.get(key)!.add(record);
    }

    return groups;
  }

  reduce<R>(reducer: (acc: R, record: T) => R, initialValue: R): R {
    return this.records.reduce(reducer, initialValue);
  }

  *[Symbol.iterator](): Iterator<T> {
    for (const record of this.records) {
      yield record;
    }
  }

  // 额外的便利方法
  map<R>(mapper: (record: T) => R): R[] {
    return this.records.map(mapper);
  }

  some(predicate: (record: T) => boolean): boolean {
    return this.records.some(predicate);
  }

  every(predicate: (record: T) => boolean): boolean {
    return this.records.every(predicate);
  }

  concat(other: IRecordSet<T>): IRecordSet<T> {
    return new RecordSet([...this.records, ...other.toArray()]);
  }

  slice(start: number, end?: number): IRecordSet<T> {
    return new RecordSet(this.records.slice(start, end));
  }
}

/**
 * 分页记录集
 * 支持大数据集的分页处理
 */
class PagedRecordSet<T> extends RecordSet<T> {
  constructor(
    private allRecords: T[],
    private pageSize: number,
    private currentPage: number = 0
  ) {
    super();
    this.loadPage(currentPage);
  }

  private loadPage(pageNumber: number): void {
    const startIndex = pageNumber * this.pageSize;
    const endIndex = Math.min(
      startIndex + this.pageSize,
      this.allRecords.length
    );

    this.clear();
    for (let i = startIndex; i < endIndex; i++) {
      this.add(this.allRecords[i]);
    }
  }

  getTotalPages(): number {
    return Math.ceil(this.allRecords.length / this.pageSize);
  }

  getCurrentPage(): number {
    return this.currentPage;
  }

  hasNextPage(): boolean {
    return this.currentPage < this.getTotalPages() - 1;
  }

  hasPreviousPage(): boolean {
    return this.currentPage > 0;
  }

  nextPage(): boolean {
    if (this.hasNextPage()) {
      this.currentPage++;
      this.loadPage(this.currentPage);
      return true;
    }
    return false;
  }

  previousPage(): boolean {
    if (this.hasPreviousPage()) {
      this.currentPage--;
      this.loadPage(this.currentPage);
      return true;
    }
    return false;
  }

  goToPage(pageNumber: number): boolean {
    if (pageNumber >= 0 && pageNumber < this.getTotalPages()) {
      this.currentPage = pageNumber;
      this.loadPage(this.currentPage);
      return true;
    }
    return false;
  }

  getTotalRecords(): number {
    return this.allRecords.length;
  }

  getPageInfo(): {
    currentPage: number;
    totalPages: number;
    pageSize: number;
    totalRecords: number;
  } {
    return {
      currentPage: this.currentPage,
      totalPages: this.getTotalPages(),
      pageSize: this.pageSize,
      totalRecords: this.getTotalRecords(),
    };
  }
}

/**
 * 排序记录集
 * 自动维护排序状态的记录集
 */
class SortedRecordSet<T> extends RecordSet<T> {
  constructor(private compareFn: (a: T, b: T) => number, records: T[] = []) {
    super();
    records.forEach((record) => this.add(record));
  }

  add(record: T): void {
    // 找到正确的插入位置
    let insertIndex = 0;
    while (
      insertIndex < this.size() &&
      this.compareFn(this.get(insertIndex)!, record) <= 0
    ) {
      insertIndex++;
    }

    this.toArray().splice(insertIndex, 0, record);
  }

  // 重写filter以保持排序
  filter(predicate: (record: T) => boolean): IRecordSet<T> {
    const filtered = this.toArray().filter(predicate);
    return new SortedRecordSet(this.compareFn, filtered);
  }
}

// ============================================================================
// 2. Special Case - 特殊情况模式
// ============================================================================

/**
 * 特殊情况模式基类
 *
 * 使用多态性来处理特殊情况，避免客户端代码中的条件检查
 * 常见应用：空对象模式、默认值处理、异常情况处理
 */

/**
 * 客户接口
 */
interface ICustomer {
  getId(): string;
  getName(): string;
  getEmail(): string;
  getCreditLimit(): Money;
  getDiscountRate(): number;
  canPurchase(amount: Money): boolean;
  sendNotification(message: string): void;
  getBillingHistory(): IBill[];
}

/**
 * 账单接口
 */
interface IBill {
  getId(): string;
  getAmount(): Money;
  getDueDate(): Date;
  isPaid(): boolean;
  pay(amount: Money): void;
}

/**
 * 普通客户实现
 */
class RegularCustomer implements ICustomer {
  constructor(
    private id: string,
    private name: string,
    private email: string,
    private creditLimit: Money,
    private discountRate: number = 0,
    private billingHistory: IBill[] = []
  ) {}

  getId(): string {
    return this.id;
  }

  getName(): string {
    return this.name;
  }

  getEmail(): string {
    return this.email;
  }

  getCreditLimit(): Money {
    return this.creditLimit;
  }

  getDiscountRate(): number {
    return this.discountRate;
  }

  canPurchase(amount: Money): boolean {
    return this.creditLimit.isGreaterThanOrEqual(amount);
  }

  sendNotification(message: string): void {
    console.log(`发送邮件给 ${this.email}: ${message}`);
    // 实际的邮件发送逻辑
  }

  getBillingHistory(): IBill[] {
    return [...this.billingHistory];
  }
}

/**
 * VIP客户（特殊情况）
 */
class VipCustomer implements ICustomer {
  constructor(
    private id: string,
    private name: string,
    private email: string,
    private creditLimit: Money,
    private vipLevel: number,
    private billingHistory: IBill[] = []
  ) {}

  getId(): string {
    return this.id;
  }

  getName(): string {
    return this.name;
  }

  getEmail(): string {
    return this.email;
  }

  getCreditLimit(): Money {
    return this.creditLimit;
  }

  getDiscountRate(): number {
    // VIP客户享受根据等级的折扣
    return Math.min(0.3, this.vipLevel * 0.05); // 最高30%折扣
  }

  canPurchase(amount: Money): boolean {
    // VIP客户可以超出信用额度的20%
    const extendedLimit = this.creditLimit.multiply(1.2);
    return extendedLimit.isGreaterThanOrEqual(amount);
  }

  sendNotification(message: string): void {
    // VIP客户优先处理
    console.log(`[VIP优先] 发送给 ${this.email}: ${message}`);
    console.log(`[VIP专线] 同时发送SMS通知给VIP${this.vipLevel}级客户`);
  }

  getBillingHistory(): IBill[] {
    return [...this.billingHistory];
  }

  getVipLevel(): number {
    return this.vipLevel;
  }
}

/**
 * 空客户（Null Object Pattern）
 * 用于处理客户不存在的情况
 */
class NullCustomer implements ICustomer {
  private static instance: NullCustomer = new NullCustomer();

  static getInstance(): NullCustomer {
    return this.instance;
  }

  private constructor() {}

  getId(): string {
    return "NULL_CUSTOMER";
  }

  getName(): string {
    return "未知客户";
  }

  getEmail(): string {
    return "no-email@nowhere.com";
  }

  getCreditLimit(): Money {
    return new Money(0);
  }

  getDiscountRate(): number {
    return 0;
  }

  canPurchase(amount: Money): boolean {
    return false; // 空客户不能购买
  }

  sendNotification(message: string): void {
    // 空实现，不发送通知
    console.log("[空客户] 忽略通知发送");
  }

  getBillingHistory(): IBill[] {
    return []; // 返回空账单历史
  }

  isNull(): boolean {
    return true;
  }
}

/**
 * 客户工厂 - 负责创建合适的客户对象
 */
class CustomerFactory {
  static createCustomer(customerData: any): ICustomer {
    if (!customerData || !customerData.id) {
      return NullCustomer.getInstance();
    }

    const creditLimit = new Money(
      customerData.creditLimit || 0,
      customerData.currency || "USD"
    );

    if (customerData.isVip) {
      return new VipCustomer(
        customerData.id,
        customerData.name,
        customerData.email,
        creditLimit,
        customerData.vipLevel || 1
      );
    }

    return new RegularCustomer(
      customerData.id,
      customerData.name,
      customerData.email,
      creditLimit,
      customerData.discountRate || 0
    );
  }
}

/**
 * 特殊情况处理器
 * 处理各种业务场景中的特殊情况
 */
class SpecialCaseHandler {
  /**
   * 处理订单折扣计算
   */
  static calculateDiscount(customer: ICustomer, orderAmount: Money): Money {
    // 不需要检查客户类型，多态性自动处理
    const discountRate = customer.getDiscountRate();
    return orderAmount.multiply(discountRate);
  }

  /**
   * 处理客户通知
   */
  static notifyCustomer(customer: ICustomer, message: string): void {
    // 多态性自动选择正确的通知方式
    customer.sendNotification(message);
  }

  /**
   * 检查购买权限
   */
  static canCustomerPurchase(customer: ICustomer, amount: Money): boolean {
    // 每种客户类型有自己的业务规则
    return customer.canPurchase(amount);
  }
}

// ============================================================================
// 3. Money - 金额模式（增强版）
// ============================================================================

/**
 * 货币枚举
 */
enum Currency {
  USD = "USD",
  EUR = "EUR",
  CNY = "CNY",
  JPY = "JPY",
  GBP = "GBP",
}

/**
 * 金额模式（增强版）
 * 处理货币计算、汇率转换、精度问题
 */
class Money {
  private static readonly CURRENCY_DECIMALS: { [key: string]: number } = {
    USD: 2,
    EUR: 2,
    CNY: 2,
    GBP: 2,
    JPY: 0,
  };

  // 使用整数存储，避免浮点数精度问题
  private readonly centAmount: number;
  private readonly currency: Currency;

  constructor(amount: number, currency: Currency = Currency.USD) {
    this.currency = currency;
    const decimals = Money.CURRENCY_DECIMALS[currency] || 2;
    this.centAmount = Math.round(amount * Math.pow(10, decimals));
  }

  /**
   * 从分/厘创建金额
   */
  static fromCents(
    centAmount: number,
    currency: Currency = Currency.USD
  ): Money {
    const money = Object.create(Money.prototype);
    money.centAmount = centAmount;
    money.currency = currency;
    return money;
  }

  /**
   * 零金额
   */
  static zero(currency: Currency = Currency.USD): Money {
    return new Money(0, currency);
  }

  /**
   * 获取金额值
   */
  getAmount(): number {
    const decimals = Money.CURRENCY_DECIMALS[this.currency] || 2;
    return this.centAmount / Math.pow(10, decimals);
  }

  /**
   * 获取分/厘值
   */
  getCentAmount(): number {
    return this.centAmount;
  }

  /**
   * 获取货币
   */
  getCurrency(): Currency {
    return this.currency;
  }

  /**
   * 加法
   */
  add(other: Money): Money {
    this.assertSameCurrency(other);
    return Money.fromCents(this.centAmount + other.centAmount, this.currency);
  }

  /**
   * 减法
   */
  subtract(other: Money): Money {
    this.assertSameCurrency(other);
    return Money.fromCents(this.centAmount - other.centAmount, this.currency);
  }

  /**
   * 乘法
   */
  multiply(factor: number): Money {
    return Money.fromCents(Math.round(this.centAmount * factor), this.currency);
  }

  /**
   * 除法
   */
  divide(divisor: number): Money {
    if (divisor === 0) {
      throw new Error("不能除以零");
    }
    return Money.fromCents(
      Math.round(this.centAmount / divisor),
      this.currency
    );
  }

  /**
   * 比较操作
   */
  equals(other: Money): boolean {
    return (
      this.centAmount === other.centAmount && this.currency === other.currency
    );
  }

  isGreaterThan(other: Money): boolean {
    this.assertSameCurrency(other);
    return this.centAmount > other.centAmount;
  }

  isGreaterThanOrEqual(other: Money): boolean {
    this.assertSameCurrency(other);
    return this.centAmount >= other.centAmount;
  }

  isLessThan(other: Money): boolean {
    this.assertSameCurrency(other);
    return this.centAmount < other.centAmount;
  }

  isLessThanOrEqual(other: Money): boolean {
    this.assertSameCurrency(other);
    return this.centAmount <= other.centAmount;
  }

  isZero(): boolean {
    return this.centAmount === 0;
  }

  isPositive(): boolean {
    return this.centAmount > 0;
  }

  isNegative(): boolean {
    return this.centAmount < 0;
  }

  /**
   * 取绝对值
   */
  abs(): Money {
    return Money.fromCents(Math.abs(this.centAmount), this.currency);
  }

  /**
   * 取负值
   */
  negate(): Money {
    return Money.fromCents(-this.centAmount, this.currency);
  }

  /**
   * 分配金额（用于平均分摊）
   */
  allocate(ratios: number[]): Money[] {
    if (ratios.length === 0) {
      throw new Error("分配比例不能为空");
    }

    const totalRatio = ratios.reduce((sum, ratio) => sum + ratio, 0);
    if (totalRatio === 0) {
      throw new Error("分配比例总和不能为零");
    }

    const results: Money[] = [];
    let remainder = this.centAmount;

    for (let i = 0; i < ratios.length - 1; i++) {
      const amount = Math.floor((this.centAmount * ratios[i]) / totalRatio);
      results.push(Money.fromCents(amount, this.currency));
      remainder -= amount;
    }

    // 最后一个分配剩余的金额，确保总和正确
    results.push(Money.fromCents(remainder, this.currency));

    return results;
  }

  /**
   * 货币转换（需要汇率）
   */
  convertTo(targetCurrency: Currency, exchangeRate: number): Money {
    if (this.currency === targetCurrency) {
      return this;
    }

    const convertedAmount = this.getAmount() * exchangeRate;
    return new Money(convertedAmount, targetCurrency);
  }

  /**
   * 格式化显示
   */
  toString(): string {
    const amount = this.getAmount();
    const decimals = Money.CURRENCY_DECIMALS[this.currency] || 2;

    return `${amount.toFixed(decimals)} ${this.currency}`;
  }

  /**
   * 格式化为本地化字符串
   */
  toLocalString(locale: string = "en-US"): string {
    const amount = this.getAmount();
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: this.currency,
    }).format(amount);
  }

  /**
   * 序列化
   */
  toJSON(): { amount: number; currency: string } {
    return {
      amount: this.getAmount(),
      currency: this.currency,
    };
  }

  /**
   * 从JSON反序列化
   */
  static fromJSON(json: { amount: number; currency: string }): Money {
    return new Money(json.amount, json.currency as Currency);
  }

  /**
   * 检查货币是否相同
   */
  private assertSameCurrency(other: Money): void {
    if (this.currency !== other.currency) {
      throw new Error(`货币不匹配: ${this.currency} vs ${other.currency}`);
    }
  }
}

// ============================================================================
// 4. Quantity - 数量模式
// ============================================================================

/**
 * 数量单位枚举
 */
enum Unit {
  PIECE = "piece",
  KILOGRAM = "kg",
  GRAM = "g",
  LITER = "l",
  MILLILITER = "ml",
  METER = "m",
  CENTIMETER = "cm",
  HOUR = "hour",
  DAY = "day",
}

/**
 * 数量模式
 * 处理带单位的数量计算
 */
class Quantity {
  constructor(private readonly amount: number, private readonly unit: Unit) {
    if (amount < 0) {
      throw new Error("数量不能为负数");
    }
  }

  getAmount(): number {
    return this.amount;
  }

  getUnit(): Unit {
    return this.unit;
  }

  add(other: Quantity): Quantity {
    this.assertSameUnit(other);
    return new Quantity(this.amount + other.amount, this.unit);
  }

  subtract(other: Quantity): Quantity {
    this.assertSameUnit(other);
    const result = this.amount - other.amount;
    if (result < 0) {
      throw new Error("结果数量不能为负数");
    }
    return new Quantity(result, this.unit);
  }

  multiply(factor: number): Quantity {
    if (factor < 0) {
      throw new Error("乘数不能为负数");
    }
    return new Quantity(this.amount * factor, this.unit);
  }

  divide(divisor: number): Quantity {
    if (divisor <= 0) {
      throw new Error("除数必须为正数");
    }
    return new Quantity(this.amount / divisor, this.unit);
  }

  equals(other: Quantity): boolean {
    return this.amount === other.amount && this.unit === other.unit;
  }

  isGreaterThan(other: Quantity): boolean {
    this.assertSameUnit(other);
    return this.amount > other.amount;
  }

  isZero(): boolean {
    return this.amount === 0;
  }

  toString(): string {
    return `${this.amount} ${this.unit}`;
  }

  private assertSameUnit(other: Quantity): void {
    if (this.unit !== other.unit) {
      throw new Error(`单位不匹配: ${this.unit} vs ${other.unit}`);
    }
  }
}

// ============================================================================
// 5. Range - 范围模式
// ============================================================================

/**
 * 数值范围模式
 */
class NumberRange {
  constructor(private readonly min: number, private readonly max: number) {
    if (min > max) {
      throw new Error("最小值不能大于最大值");
    }
  }

  getMin(): number {
    return this.min;
  }

  getMax(): number {
    return this.max;
  }

  contains(value: number): boolean {
    return value >= this.min && value <= this.max;
  }

  overlaps(other: NumberRange): boolean {
    return this.min <= other.max && this.max >= other.min;
  }

  intersect(other: NumberRange): NumberRange | null {
    if (!this.overlaps(other)) {
      return null;
    }

    const newMin = Math.max(this.min, other.min);
    const newMax = Math.min(this.max, other.max);

    return new NumberRange(newMin, newMax);
  }

  union(other: NumberRange): NumberRange {
    const newMin = Math.min(this.min, other.min);
    const newMax = Math.max(this.max, other.max);

    return new NumberRange(newMin, newMax);
  }

  size(): number {
    return this.max - this.min;
  }

  toString(): string {
    return `[${this.min}, ${this.max}]`;
  }
}

// ============================================================================
// 使用示例和测试
// ============================================================================

/**
 * 高级基础模式使用示例
 */
export class AdvancedBasePatternsDemo {
  /**
   * 演示记录集模式
   */
  async demonstrateRecordSet(): Promise<void> {
    console.log("\n=== 记录集模式演示 ===");

    // 创建产品记录
    interface Product {
      id: string;
      name: string;
      price: Money;
      category: string;
    }

    const products: Product[] = [
      {
        id: "1",
        name: "iPhone",
        price: new Money(999, Currency.USD),
        category: "Electronics",
      },
      {
        id: "2",
        name: "MacBook",
        price: new Money(1299, Currency.USD),
        category: "Electronics",
      },
      {
        id: "3",
        name: "Chair",
        price: new Money(199, Currency.USD),
        category: "Furniture",
      },
      {
        id: "4",
        name: "Desk",
        price: new Money(299, Currency.USD),
        category: "Furniture",
      },
      {
        id: "5",
        name: "Mouse",
        price: new Money(29, Currency.USD),
        category: "Electronics",
      },
    ];

    const productSet = new RecordSet(products);

    console.log(`总产品数: ${productSet.size()}`);
    console.log(`第一个产品: ${productSet.first()?.name}`);

    // 过滤操作
    const electronics = productSet.filter((p) => p.category === "Electronics");
    console.log(`电子产品数量: ${electronics.size()}`);

    // 排序操作
    const sortedByPrice = productSet.sort(
      (a, b) => a.price.getAmount() - b.price.getAmount()
    );
    console.log(
      `最便宜的产品: ${sortedByPrice.first()?.name} - ${
        sortedByPrice.first()?.price
      }`
    );

    // 分组操作
    const groupedByCategory = productSet.groupBy((p) => p.category);
    for (const [category, productGroup] of groupedByCategory) {
      console.log(`${category} 类别有 ${productGroup.size()} 个产品`);
    }

    // 聚合操作
    const totalValue = productSet.reduce(
      (sum, product) => sum.add(product.price),
      Money.zero(Currency.USD)
    );
    console.log(`产品总价值: ${totalValue}`);

    // 分页记录集演示
    console.log("\n--- 分页记录集演示 ---");
    const pagedProducts = new PagedRecordSet(products, 2);

    do {
      const pageInfo = pagedProducts.getPageInfo();
      console.log(
        `第 ${pageInfo.currentPage + 1} 页 (共 ${pageInfo.totalPages} 页):`
      );

      for (const product of pagedProducts) {
        console.log(`  - ${product.name}: ${product.price}`);
      }
    } while (pagedProducts.nextPage());
  }

  /**
   * 演示特殊情况模式
   */
  async demonstrateSpecialCase(): Promise<void> {
    console.log("\n=== 特殊情况模式演示 ===");

    // 创建不同类型的客户
    const customers: ICustomer[] = [
      CustomerFactory.createCustomer({
        id: "cust-001",
        name: "John Doe",
        email: "john@example.com",
        creditLimit: 5000,
        currency: "USD",
      }),
      CustomerFactory.createCustomer({
        id: "vip-001",
        name: "Jane Smith",
        email: "jane@example.com",
        creditLimit: 10000,
        currency: "USD",
        isVip: true,
        vipLevel: 3,
      }),
      CustomerFactory.createCustomer(null), // 空客户
    ];

    const orderAmount = new Money(1000, Currency.USD);

    for (const customer of customers) {
      console.log(`\n客户: ${customer.getName()}`);

      // 计算折扣（多态性）
      const discount = SpecialCaseHandler.calculateDiscount(
        customer,
        orderAmount
      );
      console.log(`折扣: ${discount} (${customer.getDiscountRate() * 100}%)`);

      // 检查购买权限（多态性）
      const canPurchase = SpecialCaseHandler.canCustomerPurchase(
        customer,
        orderAmount
      );
      console.log(`可以购买: ${canPurchase ? "是" : "否"}`);

      // 发送通知（多态性）
      SpecialCaseHandler.notifyCustomer(customer, "您有新的订单更新");
    }
  }

  /**
   * 演示金额模式
   */
  async demonstrateMoney(): Promise<void> {
    console.log("\n=== 金额模式演示 ===");

    const price1 = new Money(99.99, Currency.USD);
    const price2 = new Money(149.5, Currency.USD);

    console.log(`价格1: ${price1.toLocalString()}`);
    console.log(`价格2: ${price2.toLocalString()}`);

    // 基本运算
    const total = price1.add(price2);
    console.log(`总价: ${total.toLocalString()}`);

    const discountedPrice = price1.multiply(0.9); // 90%价格
    console.log(`折扣价: ${discountedPrice.toLocalString()}`);

    // 分配金额
    const allocations = total.allocate([30, 40, 30]); // 按比例分配
    console.log("分配结果:");
    allocations.forEach((amount, index) => {
      console.log(`  分配${index + 1}: ${amount.toLocalString()}`);
    });

    // 验证分配总和
    const allocatedTotal = allocations.reduce((sum, amount) => sum.add(amount));
    console.log(`分配总和: ${allocatedTotal.toLocalString()}`);
    console.log(`分配正确: ${allocatedTotal.equals(total)}`);

    // 货币转换
    const eurPrice = price1.convertTo(Currency.EUR, 0.85); // 假设汇率
    console.log(`欧元价格: ${eurPrice.toLocalString("de-DE")}`);

    // 零金额和比较
    const zero = Money.zero(Currency.USD);
    console.log(`零金额: ${zero.isZero()}`);
    console.log(`价格1 > 零: ${price1.isGreaterThan(zero)}`);
  }

  /**
   * 演示数量模式
   */
  async demonstrateQuantity(): Promise<void> {
    console.log("\n=== 数量模式演示 ===");

    const weight1 = new Quantity(2.5, Unit.KILOGRAM);
    const weight2 = new Quantity(1.8, Unit.KILOGRAM);

    console.log(`重量1: ${weight1}`);
    console.log(`重量2: ${weight2}`);

    const totalWeight = weight1.add(weight2);
    console.log(`总重量: ${totalWeight}`);

    const halfWeight = weight1.divide(2);
    console.log(`一半重量: ${halfWeight}`);

    // 体积计算
    const volume = new Quantity(1.5, Unit.LITER);
    const doubledVolume = volume.multiply(2);
    console.log(`原体积: ${volume}`);
    console.log(`双倍体积: ${doubledVolume}`);

    // 时间计算
    const workHours = new Quantity(8, Unit.HOUR);
    const workDays = new Quantity(5, Unit.DAY);

    console.log(`每日工作时间: ${workHours}`);
    console.log(`工作天数: ${workDays}`);
  }

  /**
   * 演示范围模式
   */
  async demonstrateRange(): Promise<void> {
    console.log("\n=== 范围模式演示 ===");

    const priceRange = new NumberRange(100, 500);
    const discountRange = new NumberRange(300, 800);

    console.log(`价格范围: ${priceRange}`);
    console.log(`折扣范围: ${discountRange}`);

    // 范围检查
    console.log(`250在价格范围内: ${priceRange.contains(250)}`);
    console.log(`600在价格范围内: ${priceRange.contains(600)}`);

    // 范围重叠
    console.log(`范围重叠: ${priceRange.overlaps(discountRange)}`);

    // 范围交集
    const intersection = priceRange.intersect(discountRange);
    console.log(`交集范围: ${intersection?.toString() || "无交集"}`);

    // 范围并集
    const union = priceRange.union(discountRange);
    console.log(`并集范围: ${union}`);

    console.log(`价格范围大小: ${priceRange.size()}`);
    console.log(`折扣范围大小: ${discountRange.size()}`);
  }

  /**
   * 综合示例：电商订单处理
   */
  async demonstrateComprehensiveExample(): Promise<void> {
    console.log("\n=== 综合示例：电商订单处理 ===");

    // 创建产品记录集
    interface OrderItem {
      productId: string;
      productName: string;
      unitPrice: Money;
      quantity: Quantity;
      priceRange: NumberRange;
    }

    const orderItems: OrderItem[] = [
      {
        productId: "laptop-001",
        productName: "笔记本电脑",
        unitPrice: new Money(999, Currency.USD),
        quantity: new Quantity(2, Unit.PIECE),
        priceRange: new NumberRange(800, 1200),
      },
      {
        productId: "mouse-001",
        productName: "无线鼠标",
        unitPrice: new Money(29.99, Currency.USD),
        quantity: new Quantity(3, Unit.PIECE),
        priceRange: new NumberRange(20, 50),
      },
    ];

    const orderSet = new RecordSet(orderItems);

    // 创建VIP客户
    const customer = CustomerFactory.createCustomer({
      id: "vip-customer-001",
      name: "Premium Customer",
      email: "premium@example.com",
      creditLimit: 5000,
      currency: "USD",
      isVip: true,
      vipLevel: 2,
    });

    console.log(`处理客户订单: ${customer.getName()}`);

    // 计算订单总额
    let totalAmount = Money.zero(Currency.USD);

    for (const item of orderSet) {
      const itemTotal = item.unitPrice.multiply(item.quantity.getAmount());
      totalAmount = totalAmount.add(itemTotal);

      console.log(
        `${item.productName}: ${item.unitPrice} × ${
          item.quantity
        } = ${itemTotal.toLocalString()}`
      );
    }

    console.log(`订单小计: ${totalAmount.toLocalString()}`);

    // 应用VIP折扣
    const discount = SpecialCaseHandler.calculateDiscount(
      customer,
      totalAmount
    );
    const finalAmount = totalAmount.subtract(discount);

    console.log(
      `VIP折扣: ${discount.toLocalString()} (${
        customer.getDiscountRate() * 100
      }%)`
    );
    console.log(`最终金额: ${finalAmount.toLocalString()}`);

    // 检查购买权限
    const canPurchase = SpecialCaseHandler.canCustomerPurchase(
      customer,
      finalAmount
    );
    console.log(`购买权限检查: ${canPurchase ? "通过" : "拒绝"}`);

    if (canPurchase) {
      // 分配付款（信用卡70%，积分30%）
      const paymentAllocations = finalAmount.allocate([70, 30]);
      console.log(`信用卡支付: ${paymentAllocations[0].toLocalString()}`);
      console.log(`积分支付: ${paymentAllocations[1].toLocalString()}`);

      // 发送确认通知
      SpecialCaseHandler.notifyCustomer(
        customer,
        `订单确认：总金额 ${finalAmount.toLocalString()}`
      );
    }
  }
}

// 导出主要类和接口
export {
  // 记录集模式
  IRecordSet,
  RecordSet,
  PagedRecordSet,
  SortedRecordSet,

  // 特殊情况模式
  ICustomer,
  RegularCustomer,
  VipCustomer,
  NullCustomer,
  CustomerFactory,
  SpecialCaseHandler,

  // 金额模式
  Money,
  Currency,

  // 数量模式
  Quantity,
  Unit,

  // 范围模式
  NumberRange,
};
