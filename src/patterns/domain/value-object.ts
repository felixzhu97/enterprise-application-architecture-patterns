/**
 * Value Object（值对象）模式
 *
 * 表示一个没有概念标识的对象，只由其属性值定义。
 * 值对象应该是不可变的，两个值对象如果所有属性都相等，则它们相等。
 *
 * 主要特点：
 * - 不可变性
 * - 相等性基于值而非引用
 * - 没有标识符
 * - 可以自由替换
 *
 * 优点：
 * - 线程安全
 * - 简化对象比较
 * - 防止意外修改
 * - 易于缓存和共享
 *
 * 缺点：
 * - 创建新对象的开销
 * - 大量小对象可能影响性能
 *
 * 适用场景：
 * - 金钱、日期、坐标等概念
 * - 复合数据类型
 * - 需要保证不变性的数据
 * - 频繁比较的数据
 */

/**
 * 值对象基类
 */
export abstract class ValueObject {
  /**
   * 值对象相等性比较
   */
  abstract equals(other: ValueObject): boolean;

  /**
   * 获取对象的字符串表示
   */
  abstract toString(): string;

  /**
   * 获取对象的哈希码
   */
  abstract hashCode(): number;

  /**
   * 验证对象的有效性
   */
  abstract isValid(): boolean;

  /**
   * 克隆对象
   */
  abstract clone(): ValueObject;
}

// ======================== Money 值对象 ========================

/**
 * 货币枚举
 */
export enum Currency {
  CNY = "CNY",
  USD = "USD",
  EUR = "EUR",
  GBP = "GBP",
  JPY = "JPY",
  HKD = "HKD",
}

/**
 * 金钱值对象
 */
export class Money extends ValueObject {
  private readonly _amount: number;
  private readonly _currency: Currency;

  constructor(amount: number, currency: Currency) {
    super();
    if (amount < 0) {
      throw new Error("金额不能为负数");
    }
    if (!Number.isFinite(amount)) {
      throw new Error("金额必须是有限数字");
    }
    this._amount = Math.round(amount * 100) / 100; // 保留两位小数
    this._currency = currency;
  }

  /**
   * 获取金额
   */
  get amount(): number {
    return this._amount;
  }

  /**
   * 获取货币
   */
  get currency(): Currency {
    return this._currency;
  }

  /**
   * 加法操作
   */
  add(other: Money): Money {
    this.assertSameCurrency(other);
    return new Money(this._amount + other._amount, this._currency);
  }

  /**
   * 减法操作
   */
  subtract(other: Money): Money {
    this.assertSameCurrency(other);
    const result = this._amount - other._amount;
    if (result < 0) {
      throw new Error("结果不能为负数");
    }
    return new Money(result, this._currency);
  }

  /**
   * 乘法操作
   */
  multiply(factor: number): Money {
    if (factor < 0) {
      throw new Error("乘数不能为负数");
    }
    return new Money(this._amount * factor, this._currency);
  }

  /**
   * 除法操作
   */
  divide(divisor: number): Money {
    if (divisor <= 0) {
      throw new Error("除数必须大于0");
    }
    return new Money(this._amount / divisor, this._currency);
  }

  /**
   * 比较操作
   */
  compare(other: Money): number {
    this.assertSameCurrency(other);
    return this._amount - other._amount;
  }

  /**
   * 大于比较
   */
  greaterThan(other: Money): boolean {
    return this.compare(other) > 0;
  }

  /**
   * 小于比较
   */
  lessThan(other: Money): boolean {
    return this.compare(other) < 0;
  }

  /**
   * 大于等于比较
   */
  greaterThanOrEqual(other: Money): boolean {
    return this.compare(other) >= 0;
  }

  /**
   * 小于等于比较
   */
  lessThanOrEqual(other: Money): boolean {
    return this.compare(other) <= 0;
  }

  /**
   * 是否为零
   */
  isZero(): boolean {
    return this._amount === 0;
  }

  /**
   * 是否为正数
   */
  isPositive(): boolean {
    return this._amount > 0;
  }

  /**
   * 获取绝对值
   */
  abs(): Money {
    return new Money(Math.abs(this._amount), this._currency);
  }

  /**
   * 分配金额
   */
  allocate(ratios: number[]): Money[] {
    const totalRatio = ratios.reduce((sum, ratio) => sum + ratio, 0);
    if (totalRatio === 0) {
      throw new Error("分配比例总和不能为0");
    }

    const results: Money[] = [];
    let remainder = this._amount;

    for (let i = 0; i < ratios.length; i++) {
      const allocation = Math.floor((this._amount * ratios[i]) / totalRatio);
      results.push(new Money(allocation, this._currency));
      remainder -= allocation;
    }

    // 分配剩余金额
    let index = 0;
    while (remainder > 0 && index < results.length) {
      const current = results[index];
      results[index] = new Money(current.amount + 0.01, this._currency);
      remainder -= 0.01;
      index++;
    }

    return results;
  }

  /**
   * 格式化显示
   */
  format(): string {
    const symbols: { [key in Currency]: string } = {
      CNY: "¥",
      USD: "$",
      EUR: "€",
      GBP: "£",
      JPY: "¥",
      HKD: "HK$",
    };

    return `${symbols[this._currency]}${this._amount.toFixed(2)}`;
  }

  /**
   * 断言相同货币
   */
  private assertSameCurrency(other: Money): void {
    if (this._currency !== other._currency) {
      throw new Error(`货币不匹配: ${this._currency} vs ${other._currency}`);
    }
  }

  equals(other: ValueObject): boolean {
    if (!(other instanceof Money)) {
      return false;
    }
    return this._amount === other._amount && this._currency === other._currency;
  }

  toString(): string {
    return this.format();
  }

  hashCode(): number {
    return this._amount * 31 + this._currency.charCodeAt(0);
  }

  isValid(): boolean {
    return this._amount >= 0 && Number.isFinite(this._amount);
  }

  clone(): Money {
    return new Money(this._amount, this._currency);
  }

  /**
   * 静态工厂方法
   */
  static zero(currency: Currency): Money {
    return new Money(0, currency);
  }

  static CNY(amount: number): Money {
    return new Money(amount, Currency.CNY);
  }

  static USD(amount: number): Money {
    return new Money(amount, Currency.USD);
  }

  static EUR(amount: number): Money {
    return new Money(amount, Currency.EUR);
  }
}

// ======================== Email 值对象 ========================

/**
 * 邮箱值对象
 */
export class Email extends ValueObject {
  private readonly _value: string;

  constructor(email: string) {
    super();
    if (!email || !this.isValidEmail(email)) {
      throw new Error("邮箱格式不正确");
    }
    this._value = email.toLowerCase().trim();
  }

  /**
   * 获取邮箱值
   */
  get value(): string {
    return this._value;
  }

  /**
   * 获取用户名部分
   */
  get localPart(): string {
    return this._value.split("@")[0];
  }

  /**
   * 获取域名部分
   */
  get domain(): string {
    return this._value.split("@")[1];
  }

  /**
   * 验证邮箱格式
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * 检查是否为企业邮箱
   */
  isBusinessEmail(): boolean {
    const businessDomains = ["company.com", "enterprise.com", "corp.com"];
    return businessDomains.includes(this.domain);
  }

  /**
   * 检查是否为免费邮箱
   */
  isFreeEmail(): boolean {
    const freeDomains = [
      "gmail.com",
      "yahoo.com",
      "hotmail.com",
      "163.com",
      "qq.com",
    ];
    return freeDomains.includes(this.domain);
  }

  equals(other: ValueObject): boolean {
    if (!(other instanceof Email)) {
      return false;
    }
    return this._value === other._value;
  }

  toString(): string {
    return this._value;
  }

  hashCode(): number {
    return this._value
      .split("")
      .reduce((hash, char) => hash * 31 + char.charCodeAt(0), 0);
  }

  isValid(): boolean {
    return this.isValidEmail(this._value);
  }

  clone(): Email {
    return new Email(this._value);
  }
}

// ======================== Address 值对象 ========================

/**
 * 地址值对象
 */
export class Address extends ValueObject {
  private readonly _street: string;
  private readonly _city: string;
  private readonly _province: string;
  private readonly _postalCode: string;
  private readonly _country: string;

  constructor(
    street: string,
    city: string,
    province: string,
    postalCode: string,
    country: string = "中国"
  ) {
    super();
    this._street = street?.trim() || "";
    this._city = city?.trim() || "";
    this._province = province?.trim() || "";
    this._postalCode = postalCode?.trim() || "";
    this._country = country?.trim() || "";

    if (!this.isValid()) {
      throw new Error("地址信息不完整");
    }
  }

  /**
   * 获取街道地址
   */
  get street(): string {
    return this._street;
  }

  /**
   * 获取城市
   */
  get city(): string {
    return this._city;
  }

  /**
   * 获取省份
   */
  get province(): string {
    return this._province;
  }

  /**
   * 获取邮政编码
   */
  get postalCode(): string {
    return this._postalCode;
  }

  /**
   * 获取国家
   */
  get country(): string {
    return this._country;
  }

  /**
   * 获取完整地址
   */
  getFullAddress(): string {
    return `${this._country} ${this._province} ${this._city} ${this._street} ${this._postalCode}`;
  }

  /**
   * 获取简短地址
   */
  getShortAddress(): string {
    return `${this._province} ${this._city} ${this._street}`;
  }

  /**
   * 检查是否为国内地址
   */
  isDomestic(): boolean {
    return this._country === "中国";
  }

  /**
   * 验证邮政编码
   */
  private isValidPostalCode(): boolean {
    if (this._country === "中国") {
      return /^\d{6}$/.test(this._postalCode);
    }
    return this._postalCode.length > 0;
  }

  equals(other: ValueObject): boolean {
    if (!(other instanceof Address)) {
      return false;
    }
    return (
      this._street === other._street &&
      this._city === other._city &&
      this._province === other._province &&
      this._postalCode === other._postalCode &&
      this._country === other._country
    );
  }

  toString(): string {
    return this.getFullAddress();
  }

  hashCode(): number {
    const str = `${this._street}${this._city}${this._province}${this._postalCode}${this._country}`;
    return str
      .split("")
      .reduce((hash, char) => hash * 31 + char.charCodeAt(0), 0);
  }

  isValid(): boolean {
    return (
      this._street.length > 0 &&
      this._city.length > 0 &&
      this._province.length > 0 &&
      this._country.length > 0 &&
      this.isValidPostalCode()
    );
  }

  clone(): Address {
    return new Address(
      this._street,
      this._city,
      this._province,
      this._postalCode,
      this._country
    );
  }
}

// ======================== Phone 值对象 ========================

/**
 * 电话号码值对象
 */
export class Phone extends ValueObject {
  private readonly _countryCode: string;
  private readonly _number: string;

  constructor(phone: string, countryCode: string = "+86") {
    super();
    this._countryCode = countryCode;
    this._number = this.normalizePhone(phone);

    if (!this.isValid()) {
      throw new Error("电话号码格式不正确");
    }
  }

  /**
   * 获取国家代码
   */
  get countryCode(): string {
    return this._countryCode;
  }

  /**
   * 获取号码
   */
  get number(): string {
    return this._number;
  }

  /**
   * 规范化电话号码
   */
  private normalizePhone(phone: string): string {
    return phone.replace(/\D/g, "");
  }

  /**
   * 获取格式化的电话号码
   */
  getFormattedNumber(): string {
    if (this._countryCode === "+86" && this._number.length === 11) {
      return `${this._number.slice(0, 3)}-${this._number.slice(
        3,
        7
      )}-${this._number.slice(7)}`;
    }
    return this._number;
  }

  /**
   * 获取国际格式
   */
  getInternationalFormat(): string {
    return `${this._countryCode} ${this._number}`;
  }

  /**
   * 检查是否为手机号
   */
  isMobile(): boolean {
    if (this._countryCode === "+86") {
      return /^1[3-9]\d{9}$/.test(this._number);
    }
    return this._number.length >= 10;
  }

  equals(other: ValueObject): boolean {
    if (!(other instanceof Phone)) {
      return false;
    }
    return (
      this._countryCode === other._countryCode && this._number === other._number
    );
  }

  toString(): string {
    return this.getInternationalFormat();
  }

  hashCode(): number {
    return (this._countryCode + this._number)
      .split("")
      .reduce((hash, char) => hash * 31 + char.charCodeAt(0), 0);
  }

  isValid(): boolean {
    if (this._countryCode === "+86") {
      return (
        /^1[3-9]\d{9}$/.test(this._number) ||
        /^0\d{2,3}-?\d{7,8}$/.test(this._number)
      );
    }
    return this._number.length >= 7;
  }

  clone(): Phone {
    return new Phone(this._number, this._countryCode);
  }
}

// ======================== DateRange 值对象 ========================

/**
 * 日期范围值对象
 */
export class DateRange extends ValueObject {
  private readonly _startDate: Date;
  private readonly _endDate: Date;

  constructor(startDate: Date, endDate: Date) {
    super();
    if (startDate > endDate) {
      throw new Error("开始日期不能晚于结束日期");
    }
    this._startDate = new Date(startDate.getTime());
    this._endDate = new Date(endDate.getTime());
  }

  /**
   * 获取开始日期
   */
  get startDate(): Date {
    return new Date(this._startDate.getTime());
  }

  /**
   * 获取结束日期
   */
  get endDate(): Date {
    return new Date(this._endDate.getTime());
  }

  /**
   * 获取持续天数
   */
  getDays(): number {
    const diffTime = this._endDate.getTime() - this._startDate.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * 检查日期是否在范围内
   */
  contains(date: Date): boolean {
    return date >= this._startDate && date <= this._endDate;
  }

  /**
   * 检查是否与另一个日期范围重叠
   */
  overlaps(other: DateRange): boolean {
    return (
      this._startDate <= other._endDate && this._endDate >= other._startDate
    );
  }

  /**
   * 获取与另一个日期范围的交集
   */
  intersection(other: DateRange): DateRange | null {
    if (!this.overlaps(other)) {
      return null;
    }

    const start = new Date(
      Math.max(this._startDate.getTime(), other._startDate.getTime())
    );
    const end = new Date(
      Math.min(this._endDate.getTime(), other._endDate.getTime())
    );

    return new DateRange(start, end);
  }

  /**
   * 扩展日期范围
   */
  extend(days: number): DateRange {
    const newEndDate = new Date(
      this._endDate.getTime() + days * 24 * 60 * 60 * 1000
    );
    return new DateRange(this._startDate, newEndDate);
  }

  equals(other: ValueObject): boolean {
    if (!(other instanceof DateRange)) {
      return false;
    }
    return (
      this._startDate.getTime() === other._startDate.getTime() &&
      this._endDate.getTime() === other._endDate.getTime()
    );
  }

  toString(): string {
    return `${this._startDate.toISOString().split("T")[0]} - ${
      this._endDate.toISOString().split("T")[0]
    }`;
  }

  hashCode(): number {
    return this._startDate.getTime() + this._endDate.getTime();
  }

  isValid(): boolean {
    return this._startDate <= this._endDate;
  }

  clone(): DateRange {
    return new DateRange(this._startDate, this._endDate);
  }
}

// ======================== 值对象工厂 ========================

/**
 * 值对象工厂
 */
export class ValueObjectFactory {
  /**
   * 创建金钱对象
   */
  static createMoney(amount: number, currency: Currency): Money {
    return new Money(amount, currency);
  }

  /**
   * 创建邮箱对象
   */
  static createEmail(email: string): Email {
    return new Email(email);
  }

  /**
   * 创建地址对象
   */
  static createAddress(
    street: string,
    city: string,
    province: string,
    postalCode: string,
    country?: string
  ): Address {
    return new Address(street, city, province, postalCode, country);
  }

  /**
   * 创建电话对象
   */
  static createPhone(phone: string, countryCode?: string): Phone {
    return new Phone(phone, countryCode);
  }

  /**
   * 创建日期范围对象
   */
  static createDateRange(startDate: Date, endDate: Date): DateRange {
    return new DateRange(startDate, endDate);
  }
}

// ======================== 使用示例 ========================

/**
 * 值对象使用示例
 */
export class ValueObjectExample {
  async demonstrateValueObjects() {
    console.log("=== 值对象模式演示 ===");

    // 1. 金钱对象
    console.log("\n1. 金钱对象:");
    const price1 = Money.CNY(100);
    const price2 = Money.CNY(200);
    const total = price1.add(price2);
    console.log(
      `✓ ${price1.format()} + ${price2.format()} = ${total.format()}`
    );

    // 分配金额
    const allocated = total.allocate([1, 2]);
    console.log(`✓ 分配结果: ${allocated.map((m) => m.format()).join(", ")}`);

    // 2. 邮箱对象
    console.log("\n2. 邮箱对象:");
    const email = new Email("john.doe@example.com");
    console.log(`✓ 邮箱: ${email.toString()}`);
    console.log(`✓ 用户名: ${email.localPart}`);
    console.log(`✓ 域名: ${email.domain}`);
    console.log(`✓ 是否免费邮箱: ${email.isFreeEmail()}`);

    // 3. 地址对象
    console.log("\n3. 地址对象:");
    const address = new Address(
      "中关村大街123号",
      "北京市",
      "北京市",
      "100080"
    );
    console.log(`✓ 完整地址: ${address.getFullAddress()}`);
    console.log(`✓ 简短地址: ${address.getShortAddress()}`);
    console.log(`✓ 是否国内地址: ${address.isDomestic()}`);

    // 4. 电话对象
    console.log("\n4. 电话对象:");
    const phone = new Phone("13800138000");
    console.log(`✓ 电话: ${phone.toString()}`);
    console.log(`✓ 格式化: ${phone.getFormattedNumber()}`);
    console.log(`✓ 是否手机: ${phone.isMobile()}`);

    // 5. 日期范围对象
    console.log("\n5. 日期范围对象:");
    const dateRange = new DateRange(
      new Date("2024-01-01"),
      new Date("2024-01-31")
    );
    console.log(`✓ 日期范围: ${dateRange.toString()}`);
    console.log(`✓ 持续天数: ${dateRange.getDays()}`);
    console.log(`✓ 包含今天: ${dateRange.contains(new Date())}`);

    // 6. 值对象相等性
    console.log("\n6. 值对象相等性:");
    const money1 = Money.CNY(100);
    const money2 = Money.CNY(100);
    const money3 = Money.USD(100);
    console.log(`✓ 相同金额相等: ${money1.equals(money2)}`);
    console.log(`✓ 不同货币不等: ${money1.equals(money3)}`);

    this.printValueObjectGuidelines();
  }

  private printValueObjectGuidelines(): void {
    console.log(`
值对象模式使用指南：

设计原则：
- 不可变性：一旦创建就不能修改
- 相等性：基于值而非引用
- 无标识：没有唯一标识符
- 自包含：包含所有相关行为

实现要点：
- 构造函数验证
- 重写equals和hashCode
- 提供有意义的toString
- 实现相关的业务方法

最佳实践：
- 及早验证输入
- 提供静态工厂方法
- 考虑性能影响
- 使用组合而非继承
- 保持简单和专注

常见用例：
- 金钱和货币
- 日期和时间范围
- 地址和坐标
- 邮箱和电话
- 度量和单位
    `);
  }
}
