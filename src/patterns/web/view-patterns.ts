/**
 * Web视图模式实现
 *
 * 这个文件包含了Web应用程序中常用的视图模式：
 * 1. Template View - 模板视图：将信息嵌入到HTML页面中
 * 2. Transform View - 转换视图：逐个元素处理领域数据并转换为HTML
 * 3. Two Step View - 两步视图：先形成逻辑页面，再渲染为HTML
 *
 * 这些模式都是为了有效地将动态数据转换为用户可见的HTML页面。
 */

import { readFile } from "fs/promises";
import { join } from "path";

/**
 * 视图模式异常
 */
export class ViewPatternException extends Error {
  constructor(message: string, public readonly cause?: Error) {
    super(message);
    this.name = "ViewPatternException";
  }
}

/**
 * 模板异常
 */
export class TemplateException extends ViewPatternException {
  constructor(message: string, public readonly templateName?: string) {
    super(message);
    this.name = "TemplateException";
    this.templateName = templateName;
  }
}

/**
 * 转换异常
 */
export class TransformException extends ViewPatternException {
  constructor(message: string, public readonly transformName?: string) {
    super(message);
    this.name = "TransformException";
    this.transformName = transformName;
  }
}

// ======================== Template View 模式 ========================

/**
 * 模板引擎接口
 */
export interface TemplateEngine {
  /**
   * 渲染模板
   */
  render(templateName: string, data: any): Promise<string>;

  /**
   * 编译模板
   */
  compile(templateContent: string): CompiledTemplate;

  /**
   * 注册辅助函数
   */
  registerHelper(name: string, helper: (...args: any[]) => any): void;

  /**
   * 注册部分模板
   */
  registerPartial(name: string, templateContent: string): void;
}

/**
 * 编译后的模板
 */
export interface CompiledTemplate {
  /**
   * 执行模板
   */
  execute(data: any): string;
}

/**
 * 模板视图接口
 */
export interface TemplateView {
  /**
   * 设置模板名称
   */
  setTemplateName(templateName: string): void;

  /**
   * 获取模板名称
   */
  getTemplateName(): string;

  /**
   * 添加数据
   */
  addData(key: string, value: any): void;

  /**
   * 获取数据
   */
  getData(): any;

  /**
   * 渲染视图
   */
  render(): Promise<string>;
}

/**
 * 简单模板引擎实现
 */
export class SimpleTemplateEngine implements TemplateEngine {
  private helpers: Map<string, (...args: any[]) => any> = new Map();
  private partials: Map<string, string> = new Map();
  private templateCache: Map<string, CompiledTemplate> = new Map();

  constructor() {
    this.registerDefaultHelpers();
  }

  async render(templateName: string, data: any): Promise<string> {
    try {
      // 从缓存获取或编译模板
      let compiled = this.templateCache.get(templateName);
      if (!compiled) {
        const templateContent = await this.loadTemplate(templateName);
        compiled = this.compile(templateContent);
        this.templateCache.set(templateName, compiled);
      }

      return compiled.execute(data);
    } catch (error) {
      throw new TemplateException(
        `Failed to render template: ${templateName}`,
        templateName
      );
    }
  }

  compile(templateContent: string): CompiledTemplate {
    return new SimpleCompiledTemplate(
      templateContent,
      this.helpers,
      this.partials
    );
  }

  registerHelper(name: string, helper: (...args: any[]) => any): void {
    this.helpers.set(name, helper);
  }

  registerPartial(name: string, templateContent: string): void {
    this.partials.set(name, templateContent);
  }

  private async loadTemplate(templateName: string): Promise<string> {
    // 模拟从文件系统加载模板
    return this.getBuiltinTemplate(templateName);
  }

  private getBuiltinTemplate(templateName: string): string {
    const templates: { [key: string]: string } = {
      "user-profile": `
        <div class="user-profile">
          <h1>{{user.name}}</h1>
          <p>Email: {{user.email}}</p>
          <p>Joined: {{formatDate user.createdAt}}</p>
          {{#if user.isActive}}
            <span class="badge active">Active</span>
          {{else}}
            <span class="badge inactive">Inactive</span>
          {{/if}}
        </div>
      `,
      "user-list": `
        <div class="user-list">
          <h1>Users ({{users.length}})</h1>
          {{#each users}}
            <div class="user-item">
              <h3>{{this.name}}</h3>
              <p>{{this.email}}</p>
              <a href="/users/{{this.id}}">View Profile</a>
            </div>
          {{/each}}
        </div>
      `,
      "product-catalog": `
        <div class="product-catalog">
          <h1>Product Catalog</h1>
          {{#each categories}}
            <div class="category">
              <h2>{{this.name}}</h2>
              {{#each this.products}}
                <div class="product">
                  <h3>{{this.name}}</h3>
                  <p>Price: {{formatCurrency this.price}}</p>
                  <p>{{this.description}}</p>
                  {{#if this.inStock}}
                    <button>Add to Cart</button>
                  {{else}}
                    <button disabled>Out of Stock</button>
                  {{/if}}
                </div>
              {{/each}}
            </div>
          {{/each}}
        </div>
      `,
      "order-summary": `
        <div class="order-summary">
          <h1>Order #{{order.id}}</h1>
          <div class="customer-info">
            <h2>Customer Information</h2>
            <p>Name: {{order.customer.name}}</p>
            <p>Email: {{order.customer.email}}</p>
            <p>Address: {{order.shippingAddress}}</p>
          </div>
          <div class="order-items">
            <h2>Order Items</h2>
            <table>
              <thead>
                <tr><th>Product</th><th>Quantity</th><th>Price</th><th>Total</th></tr>
              </thead>
              <tbody>
                {{#each order.items}}
                  <tr>
                    <td>{{this.productName}}</td>
                    <td>{{this.quantity}}</td>
                    <td>{{formatCurrency this.price}}</td>
                    <td>{{formatCurrency this.total}}</td>
                  </tr>
                {{/each}}
              </tbody>
            </table>
          </div>
          <div class="order-total">
            <h2>Total: {{formatCurrency order.total}}</h2>
          </div>
        </div>
      `,
    };

    return (
      templates[templateName] || `<h1>Template not found: ${templateName}</h1>`
    );
  }

  private registerDefaultHelpers(): void {
    // 日期格式化辅助函数
    this.registerHelper("formatDate", (date: Date) => {
      return date.toLocaleDateString();
    });

    // 货币格式化辅助函数
    this.registerHelper("formatCurrency", (amount: number) => {
      return `$${amount.toFixed(2)}`;
    });

    // 字符串截断辅助函数
    this.registerHelper("truncate", (text: string, length: number) => {
      return text.length > length ? text.substring(0, length) + "..." : text;
    });

    // 条件辅助函数
    this.registerHelper("eq", (a: any, b: any) => {
      return a === b;
    });

    // 数组长度辅助函数
    this.registerHelper("length", (array: any[]) => {
      return array ? array.length : 0;
    });
  }
}

/**
 * 简单编译模板实现
 */
export class SimpleCompiledTemplate implements CompiledTemplate {
  private templateContent: string;
  private helpers: Map<string, (...args: any[]) => any>;
  private partials: Map<string, string>;

  constructor(
    templateContent: string,
    helpers: Map<string, (...args: any[]) => any>,
    partials: Map<string, string>
  ) {
    this.templateContent = templateContent;
    this.helpers = helpers;
    this.partials = partials;
  }

  execute(data: any): string {
    let result = this.templateContent;

    // 处理简单变量 {{variable}}
    result = result.replace(/\{\{([^#/\s][^}]*)\}\}/g, (match, expression) => {
      const value = this.evaluateExpression(expression.trim(), data);
      return value !== undefined ? String(value) : "";
    });

    // 处理条件语句 {{#if}} {{else}} {{/if}}
    result = result.replace(
      /\{\{#if\s+([^}]+)\}\}(.*?)\{\{\/if\}\}/gs,
      (match, condition, content) => {
        const value = this.evaluateExpression(condition.trim(), data);
        if (value) {
          // 检查是否有else子句
          const elseMatch = content.match(/^(.*?)\{\{else\}\}(.*)$/s);
          if (elseMatch) {
            return elseMatch[1];
          }
          return content;
        } else {
          // 检查是否有else子句
          const elseMatch = content.match(/^(.*?)\{\{else\}\}(.*)$/s);
          if (elseMatch) {
            return elseMatch[2];
          }
          return "";
        }
      }
    );

    // 处理循环语句 {{#each}} {{/each}}
    result = result.replace(
      /\{\{#each\s+([^}]+)\}\}(.*?)\{\{\/each\}\}/gs,
      (match, arrayPath, content) => {
        const array = this.evaluateExpression(arrayPath.trim(), data);
        if (Array.isArray(array)) {
          return array
            .map((item) => {
              return content
                .replace(/\{\{this\.([^}]+)\}\}/g, (itemMatch, prop) => {
                  return item[prop] !== undefined ? String(item[prop]) : "";
                })
                .replace(/\{\{this\}\}/g, String(item));
            })
            .join("");
        }
        return "";
      }
    );

    return result;
  }

  private evaluateExpression(expression: string, data: any): any {
    // 检查是否是辅助函数调用
    const helperMatch = expression.match(/^(\w+)\s+(.+)$/);
    if (helperMatch) {
      const [, helperName, args] = helperMatch;
      const helper = this.helpers.get(helperName);
      if (helper) {
        const argValues = args
          .split(/\s+/)
          .map((arg) => this.evaluateExpression(arg, data));
        return helper(...argValues);
      }
    }

    // 处理对象属性访问
    const parts = expression.split(".");
    let current = data;
    for (const part of parts) {
      if (current && typeof current === "object" && part in current) {
        current = current[part];
      } else {
        return undefined;
      }
    }
    return current;
  }
}

/**
 * 模板视图实现
 */
export class HtmlTemplateView implements TemplateView {
  private templateName: string = "";
  private data: any = {};
  private templateEngine: TemplateEngine;

  constructor(templateEngine: TemplateEngine) {
    this.templateEngine = templateEngine;
  }

  setTemplateName(templateName: string): void {
    this.templateName = templateName;
  }

  getTemplateName(): string {
    return this.templateName;
  }

  addData(key: string, value: any): void {
    this.data[key] = value;
  }

  getData(): any {
    return this.data;
  }

  async render(): Promise<string> {
    if (!this.templateName) {
      throw new TemplateException("Template name not set");
    }

    return await this.templateEngine.render(this.templateName, this.data);
  }
}

// ======================== Transform View 模式 ========================

/**
 * 转换器接口
 */
export interface Transformer {
  /**
   * 转换数据
   */
  transform(data: any): TransformResult;

  /**
   * 获取转换器名称
   */
  getName(): string;
}

/**
 * 转换结果
 */
export interface TransformResult {
  html: string;
  metadata?: any;
}

/**
 * 转换视图接口
 */
export interface TransformView {
  /**
   * 添加转换器
   */
  addTransformer(transformer: Transformer): void;

  /**
   * 移除转换器
   */
  removeTransformer(transformerName: string): void;

  /**
   * 转换数据
   */
  transform(data: any): Promise<string>;
}

/**
 * 抽象转换器基类
 */
export abstract class AbstractTransformer implements Transformer {
  protected name: string;

  constructor(name: string) {
    this.name = name;
  }

  abstract transform(data: any): TransformResult;

  getName(): string {
    return this.name;
  }
}

/**
 * 用户转换器
 */
export class UserTransformer extends AbstractTransformer {
  constructor() {
    super("user");
  }

  transform(user: any): TransformResult {
    const html = `
      <div class="user-card">
        <div class="user-avatar">
          <img src="${user.avatar || "/default-avatar.png"}" alt="${user.name}">
        </div>
        <div class="user-info">
          <h3>${user.name}</h3>
          <p>${user.email}</p>
          <div class="user-meta">
            <span class="badge ${user.isActive ? "active" : "inactive"}">
              ${user.isActive ? "Active" : "Inactive"}
            </span>
            <span class="join-date">
              Joined: ${new Date(user.createdAt).toLocaleDateString()}
            </span>
          </div>
        </div>
      </div>
    `;

    return {
      html,
      metadata: {
        userId: user.id,
        isActive: user.isActive,
        joinDate: user.createdAt,
      },
    };
  }
}

/**
 * 产品转换器
 */
export class ProductTransformer extends AbstractTransformer {
  constructor() {
    super("product");
  }

  transform(product: any): TransformResult {
    const html = `
      <div class="product-card">
        <div class="product-image">
          <img src="${product.image || "/default-product.png"}" alt="${
      product.name
    }">
        </div>
        <div class="product-info">
          <h3>${product.name}</h3>
          <p class="product-price">$${product.price.toFixed(2)}</p>
          <p class="product-description">${product.description}</p>
          <div class="product-actions">
            ${
              product.stock > 0
                ? `<button class="btn-add-cart" data-product-id="${product.id}">Add to Cart</button>`
                : `<button class="btn-out-of-stock" disabled>Out of Stock</button>`
            }
          </div>
        </div>
      </div>
    `;

    return {
      html,
      metadata: {
        productId: product.id,
        price: product.price,
        inStock: product.stock > 0,
        category: product.category,
      },
    };
  }
}

/**
 * 订单转换器
 */
export class OrderTransformer extends AbstractTransformer {
  constructor() {
    super("order");
  }

  transform(order: any): TransformResult {
    const itemsHtml = order.items
      .map(
        (item: any) => `
      <tr>
        <td>${item.productName}</td>
        <td>${item.quantity}</td>
        <td>$${item.price.toFixed(2)}</td>
        <td>$${(item.quantity * item.price).toFixed(2)}</td>
      </tr>
    `
      )
      .join("");

    const html = `
      <div class="order-card">
        <div class="order-header">
          <h3>Order #${order.id}</h3>
          <span class="order-status ${order.status}">${order.status}</span>
        </div>
        <div class="order-details">
          <table class="order-items">
            <thead>
              <tr><th>Product</th><th>Quantity</th><th>Price</th><th>Total</th></tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>
          <div class="order-total">
            <strong>Total: $${order.total.toFixed(2)}</strong>
          </div>
        </div>
      </div>
    `;

    return {
      html,
      metadata: {
        orderId: order.id,
        status: order.status,
        total: order.total,
        itemCount: order.items.length,
      },
    };
  }
}

/**
 * 列表转换器
 */
export class ListTransformer extends AbstractTransformer {
  private itemTransformer: Transformer;

  constructor(itemTransformer: Transformer) {
    super(`${itemTransformer.getName()}-list`);
    this.itemTransformer = itemTransformer;
  }

  transform(data: any): TransformResult {
    const { items, title, className } = data;

    if (!Array.isArray(items)) {
      throw new TransformException("Data must contain an array of items");
    }

    const itemsHtml = items
      .map((item) => {
        const result = this.itemTransformer.transform(item);
        return result.html;
      })
      .join("");

    const html = `
      <div class="${className || "list-container"}">
        ${title ? `<h2>${title}</h2>` : ""}
        <div class="list-items">
          ${itemsHtml}
        </div>
      </div>
    `;

    return {
      html,
      metadata: {
        itemCount: items.length,
        transformerUsed: this.itemTransformer.getName(),
      },
    };
  }
}

/**
 * 转换视图实现
 */
export class HtmlTransformView implements TransformView {
  private transformers: Map<string, Transformer> = new Map();

  addTransformer(transformer: Transformer): void {
    this.transformers.set(transformer.getName(), transformer);
  }

  removeTransformer(transformerName: string): void {
    this.transformers.delete(transformerName);
  }

  async transform(data: any): Promise<string> {
    const { type, ...actualData } = data;

    if (!type) {
      throw new TransformException("Data type not specified");
    }

    const transformer = this.transformers.get(type);
    if (!transformer) {
      throw new TransformException(`Transformer not found: ${type}`, type);
    }

    const result = transformer.transform(actualData);
    return result.html;
  }
}

// ======================== Two Step View 模式 ========================

/**
 * 逻辑页面接口
 */
export interface LogicalPage {
  /**
   * 获取页面类型
   */
  getType(): string;

  /**
   * 获取页面数据
   */
  getData(): any;

  /**
   * 获取页面元数据
   */
  getMetadata(): any;

  /**
   * 添加组件
   */
  addComponent(name: string, component: PageComponent): void;

  /**
   * 获取组件
   */
  getComponent(name: string): PageComponent | undefined;

  /**
   * 获取所有组件
   */
  getAllComponents(): Map<string, PageComponent>;
}

/**
 * 页面组件接口
 */
export interface PageComponent {
  /**
   * 获取组件名称
   */
  getName(): string;

  /**
   * 获取组件数据
   */
  getData(): any;

  /**
   * 渲染组件
   */
  render(): string;
}

/**
 * 页面渲染器接口
 */
export interface PageRenderer {
  /**
   * 渲染逻辑页面
   */
  render(logicalPage: LogicalPage): Promise<string>;

  /**
   * 注册页面模板
   */
  registerPageTemplate(pageType: string, template: string): void;

  /**
   * 注册组件渲染器
   */
  registerComponentRenderer(
    componentName: string,
    renderer: (component: PageComponent) => string
  ): void;
}

/**
 * 两步视图接口
 */
export interface TwoStepView {
  /**
   * 第一步：构建逻辑页面
   */
  buildLogicalPage(data: any): LogicalPage;

  /**
   * 第二步：渲染HTML
   */
  renderToHtml(logicalPage: LogicalPage): Promise<string>;

  /**
   * 完整渲染过程
   */
  render(data: any): Promise<string>;
}

/**
 * 抽象页面组件基类
 */
export abstract class AbstractPageComponent implements PageComponent {
  protected name: string;
  protected data: any;

  constructor(name: string, data: any) {
    this.name = name;
    this.data = data;
  }

  getName(): string {
    return this.name;
  }

  getData(): any {
    return this.data;
  }

  abstract render(): string;
}

/**
 * 导航组件
 */
export class NavigationComponent extends AbstractPageComponent {
  constructor(data: any) {
    super("navigation", data);
  }

  render(): string {
    const navItems = this.data.items || [];
    const itemsHtml = navItems
      .map(
        (item: any) =>
          `<li><a href="${item.url}" ${item.active ? 'class="active"' : ""}>${
            item.title
          }</a></li>`
      )
      .join("");

    return `
      <nav class="main-navigation">
        <ul>
          ${itemsHtml}
        </ul>
      </nav>
    `;
  }
}

/**
 * 面包屑组件
 */
export class BreadcrumbComponent extends AbstractPageComponent {
  constructor(data: any) {
    super("breadcrumb", data);
  }

  render(): string {
    const items = this.data.items || [];
    const itemsHtml = items
      .map((item: any, index: number) => {
        const isLast = index === items.length - 1;
        return isLast
          ? `<span class="breadcrumb-current">${item.title}</span>`
          : `<a href="${item.url}">${item.title}</a>`;
      })
      .join(" / ");

    return `
      <div class="breadcrumb">
        ${itemsHtml}
      </div>
    `;
  }
}

/**
 * 内容组件
 */
export class ContentComponent extends AbstractPageComponent {
  constructor(data: any) {
    super("content", data);
  }

  render(): string {
    return `
      <div class="main-content">
        ${this.data.html || ""}
      </div>
    `;
  }
}

/**
 * 侧边栏组件
 */
export class SidebarComponent extends AbstractPageComponent {
  constructor(data: any) {
    super("sidebar", data);
  }

  render(): string {
    const widgets = this.data.widgets || [];
    const widgetsHtml = widgets
      .map(
        (widget: any) => `
      <div class="widget">
        <h3>${widget.title}</h3>
        <div class="widget-content">
          ${widget.content}
        </div>
      </div>
    `
      )
      .join("");

    return `
      <aside class="sidebar">
        ${widgetsHtml}
      </aside>
    `;
  }
}

/**
 * 逻辑页面实现
 */
export class HtmlLogicalPage implements LogicalPage {
  private type: string;
  private data: any;
  private metadata: any;
  private components: Map<string, PageComponent> = new Map();

  constructor(type: string, data: any, metadata: any = {}) {
    this.type = type;
    this.data = data;
    this.metadata = metadata;
  }

  getType(): string {
    return this.type;
  }

  getData(): any {
    return this.data;
  }

  getMetadata(): any {
    return this.metadata;
  }

  addComponent(name: string, component: PageComponent): void {
    this.components.set(name, component);
  }

  getComponent(name: string): PageComponent | undefined {
    return this.components.get(name);
  }

  getAllComponents(): Map<string, PageComponent> {
    return new Map(this.components);
  }
}

/**
 * 页面渲染器实现
 */
export class HtmlPageRenderer implements PageRenderer {
  private pageTemplates: Map<string, string> = new Map();
  private componentRenderers: Map<
    string,
    (component: PageComponent) => string
  > = new Map();

  constructor() {
    this.registerDefaultPageTemplates();
    this.registerDefaultComponentRenderers();
  }

  async render(logicalPage: LogicalPage): Promise<string> {
    const template = this.pageTemplates.get(logicalPage.getType());
    if (!template) {
      throw new ViewPatternException(
        `Page template not found: ${logicalPage.getType()}`
      );
    }

    let html = template;

    // 替换组件占位符
    const components = logicalPage.getAllComponents();
    for (const [name, component] of components) {
      const placeholder = `{{${name}}}`;
      const renderer = this.componentRenderers.get(component.getName());
      const componentHtml = renderer ? renderer(component) : component.render();
      html = html.replace(new RegExp(placeholder, "g"), componentHtml);
    }

    // 替换页面数据
    const data = logicalPage.getData();
    html = html.replace(/\{\{page\.([^}]+)\}\}/g, (match, key) => {
      return data[key] || "";
    });

    return html;
  }

  registerPageTemplate(pageType: string, template: string): void {
    this.pageTemplates.set(pageType, template);
  }

  registerComponentRenderer(
    componentName: string,
    renderer: (component: PageComponent) => string
  ): void {
    this.componentRenderers.set(componentName, renderer);
  }

  private registerDefaultPageTemplates(): void {
    this.pageTemplates.set(
      "standard",
      `
      <!DOCTYPE html>
      <html>
        <head>
          <title>{{page.title}}</title>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 0; }
            .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
            .header { background: #333; color: white; padding: 1rem; }
            .main { display: flex; gap: 20px; }
            .content { flex: 1; }
            .sidebar { width: 300px; }
            .footer { text-align: center; padding: 20px; background: #f5f5f5; }
          </style>
        </head>
        <body>
          <header class="header">
            <h1>{{page.title}}</h1>
            {{navigation}}
          </header>
          <div class="container">
            {{breadcrumb}}
            <div class="main">
              <div class="content">
                {{content}}
              </div>
              {{sidebar}}
            </div>
          </div>
          <footer class="footer">
            <p>&copy; 2024 Enterprise Application. All rights reserved.</p>
          </footer>
        </body>
      </html>
    `
    );

    this.pageTemplates.set(
      "simple",
      `
      <!DOCTYPE html>
      <html>
        <head>
          <title>{{page.title}}</title>
          <meta charset="utf-8">
        </head>
        <body>
          <h1>{{page.title}}</h1>
          {{content}}
        </body>
      </html>
    `
    );
  }

  private registerDefaultComponentRenderers(): void {
    this.componentRenderers.set("navigation", (component) =>
      component.render()
    );
    this.componentRenderers.set("breadcrumb", (component) =>
      component.render()
    );
    this.componentRenderers.set("content", (component) => component.render());
    this.componentRenderers.set("sidebar", (component) => component.render());
  }
}

/**
 * 两步视图实现
 */
export class HtmlTwoStepView implements TwoStepView {
  private pageRenderer: PageRenderer;

  constructor(pageRenderer: PageRenderer) {
    this.pageRenderer = pageRenderer;
  }

  buildLogicalPage(data: any): LogicalPage {
    const { pageType, title, content, navigation, breadcrumb, sidebar } = data;

    const logicalPage = new HtmlLogicalPage(
      pageType || "standard",
      { title },
      {
        generatedAt: new Date(),
        components: [],
      }
    );

    // 添加导航组件
    if (navigation) {
      logicalPage.addComponent(
        "navigation",
        new NavigationComponent(navigation)
      );
    }

    // 添加面包屑组件
    if (breadcrumb) {
      logicalPage.addComponent(
        "breadcrumb",
        new BreadcrumbComponent(breadcrumb)
      );
    }

    // 添加内容组件
    if (content) {
      logicalPage.addComponent("content", new ContentComponent(content));
    }

    // 添加侧边栏组件
    if (sidebar) {
      logicalPage.addComponent("sidebar", new SidebarComponent(sidebar));
    }

    return logicalPage;
  }

  async renderToHtml(logicalPage: LogicalPage): Promise<string> {
    return await this.pageRenderer.render(logicalPage);
  }

  async render(data: any): Promise<string> {
    const logicalPage = this.buildLogicalPage(data);
    return await this.renderToHtml(logicalPage);
  }
}

// ======================== 模式演示类 ========================

/**
 * 视图模式演示类
 */
export class ViewPatternsExample {
  private templateEngine: TemplateEngine;
  private templateView: TemplateView;
  private transformView: TransformView;
  private twoStepView: TwoStepView;

  constructor() {
    this.templateEngine = new SimpleTemplateEngine();
    this.templateView = new HtmlTemplateView(this.templateEngine);
    this.transformView = new HtmlTransformView();
    this.twoStepView = new HtmlTwoStepView(new HtmlPageRenderer());

    this.setupTransformers();
  }

  /**
   * 演示视图模式
   */
  public async demonstrateViewPatterns(): Promise<void> {
    console.log("=== Web视图模式演示 ===");

    try {
      // 1. Template View
      console.log("\n1. Template View 模式:");
      await this.demonstrateTemplateView();

      // 2. Transform View
      console.log("\n2. Transform View 模式:");
      await this.demonstrateTransformView();

      // 3. Two Step View
      console.log("\n3. Two Step View 模式:");
      await this.demonstrateTwoStepView();

      this.printViewPatternsGuidelines();
    } catch (error) {
      console.error("视图模式演示失败:", error);
    }
  }

  private async demonstrateTemplateView(): Promise<void> {
    // 用户资料模板
    this.templateView.setTemplateName("user-profile");
    this.templateView.addData("user", {
      name: "John Doe",
      email: "john@example.com",
      createdAt: new Date(),
      isActive: true,
    });

    const userProfileHtml = await this.templateView.render();
    console.log(
      "✓ 用户资料模板渲染:",
      userProfileHtml.substring(0, 100) + "..."
    );

    // 用户列表模板
    this.templateView.setTemplateName("user-list");
    this.templateView.addData("users", [
      { id: 1, name: "John Doe", email: "john@example.com" },
      { id: 2, name: "Jane Smith", email: "jane@example.com" },
    ]);

    const userListHtml = await this.templateView.render();
    console.log("✓ 用户列表模板渲染:", userListHtml.substring(0, 100) + "...");

    // 产品目录模板
    this.templateView.setTemplateName("product-catalog");
    this.templateView.addData("categories", [
      {
        name: "电子产品",
        products: [
          {
            name: "笔记本电脑",
            price: 1299.99,
            description: "高性能笔记本",
            inStock: true,
          },
          {
            name: "智能手机",
            price: 899.99,
            description: "最新款智能手机",
            inStock: false,
          },
        ],
      },
    ]);

    const catalogHtml = await this.templateView.render();
    console.log("✓ 产品目录模板渲染:", catalogHtml.substring(0, 100) + "...");
  }

  private async demonstrateTransformView(): Promise<void> {
    // 用户数据转换
    const userData = {
      type: "user",
      id: 1,
      name: "John Doe",
      email: "john@example.com",
      avatar: null,
      isActive: true,
      createdAt: new Date(),
    };

    const userHtml = await this.transformView.transform(userData);
    console.log("✓ 用户数据转换:", userHtml.substring(0, 100) + "...");

    // 产品数据转换
    const productData = {
      type: "product",
      id: 1,
      name: "笔记本电脑",
      price: 1299.99,
      description: "高性能笔记本电脑",
      image: null,
      stock: 10,
      category: "电子产品",
    };

    const productHtml = await this.transformView.transform(productData);
    console.log("✓ 产品数据转换:", productHtml.substring(0, 100) + "...");

    // 用户列表转换
    const userListData = {
      type: "user-list",
      title: "用户列表",
      className: "user-list-container",
      items: [
        {
          id: 1,
          name: "John Doe",
          email: "john@example.com",
          isActive: true,
          createdAt: new Date(),
        },
        {
          id: 2,
          name: "Jane Smith",
          email: "jane@example.com",
          isActive: false,
          createdAt: new Date(),
        },
      ],
    };

    const userListHtml = await this.transformView.transform(userListData);
    console.log("✓ 用户列表转换:", userListHtml.substring(0, 100) + "...");
  }

  private async demonstrateTwoStepView(): Promise<void> {
    // 构建页面数据
    const pageData = {
      pageType: "standard",
      title: "用户管理系统",
      navigation: {
        items: [
          { title: "首页", url: "/", active: false },
          { title: "用户", url: "/users", active: true },
          { title: "产品", url: "/products", active: false },
          { title: "订单", url: "/orders", active: false },
        ],
      },
      breadcrumb: {
        items: [
          { title: "首页", url: "/" },
          { title: "用户管理", url: "/users" },
          { title: "用户列表", url: "/users/list" },
        ],
      },
      content: {
        html: `
          <h2>用户列表</h2>
          <table>
            <thead>
              <tr><th>ID</th><th>姓名</th><th>邮箱</th><th>状态</th></tr>
            </thead>
            <tbody>
              <tr><td>1</td><td>John Doe</td><td>john@example.com</td><td>活跃</td></tr>
              <tr><td>2</td><td>Jane Smith</td><td>jane@example.com</td><td>非活跃</td></tr>
            </tbody>
          </table>
        `,
      },
      sidebar: {
        widgets: [
          {
            title: "统计信息",
            content: `
              <ul>
                <li>总用户数: 1,234</li>
                <li>活跃用户: 987</li>
                <li>今日新增: 23</li>
              </ul>
            `,
          },
          {
            title: "快速操作",
            content: `
              <ul>
                <li><a href="/users/new">添加用户</a></li>
                <li><a href="/users/export">导出数据</a></li>
                <li><a href="/users/import">导入数据</a></li>
              </ul>
            `,
          },
        ],
      },
    };

    // 第一步：构建逻辑页面
    const logicalPage = this.twoStepView.buildLogicalPage(pageData);
    console.log(
      "✓ 逻辑页面构建完成，组件数量:",
      logicalPage.getAllComponents().size
    );

    // 第二步：渲染HTML
    const finalHtml = await this.twoStepView.renderToHtml(logicalPage);
    console.log("✓ 两步视图渲染完成，HTML长度:", finalHtml.length);

    // 完整渲染过程
    const completeHtml = await this.twoStepView.render(pageData);
    console.log("✓ 完整渲染过程完成，HTML长度:", completeHtml.length);
  }

  private setupTransformers(): void {
    // 注册转换器
    this.transformView.addTransformer(new UserTransformer());
    this.transformView.addTransformer(new ProductTransformer());
    this.transformView.addTransformer(new OrderTransformer());
    this.transformView.addTransformer(
      new ListTransformer(new UserTransformer())
    );
    this.transformView.addTransformer(
      new ListTransformer(new ProductTransformer())
    );
  }

  private printViewPatternsGuidelines(): void {
    console.log(`
Web视图模式使用指南：

1. Template View（模板视图）：
   - 将信息嵌入到HTML页面中
   - 使用模板引擎处理动态内容
   - 支持辅助函数和部分模板
   - 适合复杂的HTML结构

2. Transform View（转换视图）：
   - 逐个元素处理领域数据
   - 转换数据为HTML片段
   - 每种数据类型对应一个转换器
   - 适合数据驱动的视图

3. Two Step View（两步视图）：
   - 第一步：构建逻辑页面
   - 第二步：渲染为HTML
   - 分离内容和表现
   - 适合复杂的页面布局

选择指南：
- 静态内容多：Template View
- 动态数据多：Transform View
- 复杂布局：Two Step View
- 简单页面：Template View
- 数据展示：Transform View

最佳实践：
- 分离数据和表现逻辑
- 使用组件化的设计
- 提供缓存机制
- 考虑性能优化
- 支持主题切换
- 提供错误处理

与其他模式的关系：
- 与MVC中的View层对应
- 与Page Controller配合使用
- 可以集成到Front Controller中
- 支持Application Controller的导航

注意事项：
- 避免在视图中放置业务逻辑
- 合理使用缓存提高性能
- 考虑安全性（XSS防护）
- 支持国际化
- 保持视图的可测试性
    `);
  }
}
