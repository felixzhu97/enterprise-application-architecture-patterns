/**
 * MVC相关的Web表现模式实现
 *
 * 这个文件包含了Web应用程序中常用的MVC相关模式：
 * 1. Model View Controller (MVC) - 模型-视图-控制器
 * 2. Page Controller - 页面控制器
 * 3. Front Controller - 前端控制器
 * 4. Application Controller - 应用控制器
 *
 * 这些模式都是为了分离表现逻辑、业务逻辑和用户界面，
 * 提高代码的可维护性和可测试性。
 */

import { Request, Response, NextFunction } from "express";
import { Router } from "express";

/**
 * Web模式异常
 */
export class WebPatternException extends Error {
  constructor(message: string, public readonly cause?: Error) {
    super(message);
    this.name = "WebPatternException";
  }
}

/**
 * 视图渲染异常
 */
export class ViewRenderException extends WebPatternException {
  constructor(message: string, public readonly templateName?: string) {
    super(message);
    this.name = "ViewRenderException";
    this.templateName = templateName;
  }
}

/**
 * 路由异常
 */
export class RoutingException extends WebPatternException {
  constructor(message: string, public readonly route?: string) {
    super(message);
    this.name = "RoutingException";
    this.route = route;
  }
}

// ======================== Model View Controller (MVC) 模式 ========================

/**
 * 模型接口
 * 负责数据和业务逻辑
 */
export interface Model {
  /**
   * 获取数据
   */
  getData(): Promise<any>;

  /**
   * 保存数据
   */
  saveData(data: any): Promise<void>;

  /**
   * 验证数据
   */
  validateData(data: any): ValidationResult;

  /**
   * 添加观察者
   */
  addObserver(observer: ModelObserver): void;

  /**
   * 移除观察者
   */
  removeObserver(observer: ModelObserver): void;

  /**
   * 通知观察者
   */
  notifyObservers(event: string, data?: any): void;
}

/**
 * 模型观察者接口
 */
export interface ModelObserver {
  /**
   * 更新通知
   */
  update(event: string, data?: any): void;
}

/**
 * 视图接口
 * 负责用户界面展示
 */
export interface View {
  /**
   * 渲染视图
   */
  render(data: any): Promise<string>;

  /**
   * 设置模板
   */
  setTemplate(templateName: string): void;

  /**
   * 获取模板
   */
  getTemplate(): string;

  /**
   * 添加数据到视图
   */
  addData(key: string, value: any): void;

  /**
   * 获取视图数据
   */
  getViewData(): any;
}

/**
 * 控制器接口
 * 负责协调模型和视图
 */
export interface Controller {
  /**
   * 处理请求
   */
  handleRequest(req: Request, res: Response, next: NextFunction): Promise<void>;

  /**
   * 设置模型
   */
  setModel(model: Model): void;

  /**
   * 设置视图
   */
  setView(view: View): void;

  /**
   * 获取模型
   */
  getModel(): Model;

  /**
   * 获取视图
   */
  getView(): View;
}

/**
 * 验证结果
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * 抽象模型基类
 */
export abstract class AbstractModel implements Model {
  protected observers: ModelObserver[] = [];
  protected data: any = {};

  async getData(): Promise<any> {
    return this.data;
  }

  async saveData(data: any): Promise<void> {
    this.data = { ...this.data, ...data };
    this.notifyObservers("dataChanged", this.data);
  }

  abstract validateData(data: any): ValidationResult;

  addObserver(observer: ModelObserver): void {
    this.observers.push(observer);
  }

  removeObserver(observer: ModelObserver): void {
    const index = this.observers.indexOf(observer);
    if (index > -1) {
      this.observers.splice(index, 1);
    }
  }

  notifyObservers(event: string, data?: any): void {
    this.observers.forEach((observer) => observer.update(event, data));
  }
}

/**
 * 抽象视图基类
 */
export abstract class AbstractView implements View {
  protected templateName: string = "";
  protected viewData: any = {};

  abstract render(data: any): Promise<string>;

  setTemplate(templateName: string): void {
    this.templateName = templateName;
  }

  getTemplate(): string {
    return this.templateName;
  }

  addData(key: string, value: any): void {
    this.viewData[key] = value;
  }

  getViewData(): any {
    return this.viewData;
  }
}

/**
 * 抽象控制器基类
 */
export abstract class AbstractController implements Controller {
  protected model: Model;
  protected view: View;

  constructor(model: Model, view: View) {
    this.model = model;
    this.view = view;
  }

  abstract handleRequest(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void>;

  setModel(model: Model): void {
    this.model = model;
  }

  setView(view: View): void {
    this.view = view;
  }

  getModel(): Model {
    return this.model;
  }

  getView(): View {
    return this.view;
  }
}

/**
 * 用户模型
 */
export class UserModel extends AbstractModel {
  private users: Array<{ id: number; name: string; email: string }> = [];

  async getData(): Promise<any> {
    return this.users;
  }

  async saveData(userData: { name: string; email: string }): Promise<void> {
    const user = {
      id: this.users.length + 1,
      name: userData.name,
      email: userData.email,
    };
    this.users.push(user);
    this.notifyObservers("userAdded", user);
  }

  async getUserById(id: number): Promise<any> {
    return this.users.find((user) => user.id === id);
  }

  validateData(data: any): ValidationResult {
    const errors: string[] = [];

    if (!data.name || data.name.trim().length < 2) {
      errors.push("姓名至少需要2个字符");
    }

    if (!data.email || !data.email.includes("@")) {
      errors.push("邮箱格式不正确");
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}

/**
 * HTML视图
 */
export class HtmlView extends AbstractView {
  async render(data: any): Promise<string> {
    if (!this.templateName) {
      throw new ViewRenderException("Template name not set");
    }

    // 模拟模板渲染
    return this.renderTemplate(this.templateName, {
      ...this.viewData,
      ...data,
    });
  }

  private renderTemplate(templateName: string, data: any): string {
    switch (templateName) {
      case "user-list":
        return this.renderUserList(data);
      case "user-form":
        return this.renderUserForm(data);
      case "user-detail":
        return this.renderUserDetail(data);
      default:
        return `<h1>Template not found: ${templateName}</h1>`;
    }
  }

  private renderUserList(data: any): string {
    const users = data.users || [];
    const userRows = users
      .map(
        (user: any) =>
          `<tr>
        <td>${user.id}</td>
        <td>${user.name}</td>
        <td>${user.email}</td>
        <td>
          <a href="/users/${user.id}">查看</a>
          <a href="/users/${user.id}/edit">编辑</a>
        </td>
      </tr>`
      )
      .join("");

    return `
      <h1>用户列表</h1>
      <table>
        <thead>
          <tr><th>ID</th><th>姓名</th><th>邮箱</th><th>操作</th></tr>
        </thead>
        <tbody>
          ${userRows}
        </tbody>
      </table>
      <a href="/users/new">添加用户</a>
    `;
  }

  private renderUserForm(data: any): string {
    const user = data.user || {};
    const errors = data.errors || [];
    const errorHtml =
      errors.length > 0
        ? `<div class="errors">${errors
            .map((error: string) => `<p>${error}</p>`)
            .join("")}</div>`
        : "";

    return `
      <h1>${user.id ? "编辑用户" : "添加用户"}</h1>
      ${errorHtml}
      <form method="post">
        <label>姓名: <input name="name" value="${
          user.name || ""
        }" required></label><br>
        <label>邮箱: <input name="email" value="${
          user.email || ""
        }" required></label><br>
        <button type="submit">保存</button>
        <a href="/users">取消</a>
      </form>
    `;
  }

  private renderUserDetail(data: any): string {
    const user = data.user || {};
    return `
      <h1>用户详情</h1>
      <p>ID: ${user.id}</p>
      <p>姓名: ${user.name}</p>
      <p>邮箱: ${user.email}</p>
      <a href="/users/${user.id}/edit">编辑</a>
      <a href="/users">返回列表</a>
    `;
  }
}

/**
 * 用户控制器
 */
export class UserController
  extends AbstractController
  implements ModelObserver
{
  constructor(model: UserModel, view: HtmlView) {
    super(model, view);
    model.addObserver(this);
  }

  async handleRequest(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const action = req.params.action || "index";
      const id = req.params.id;

      switch (action) {
        case "index":
          await this.indexAction(req, res);
          break;
        case "show":
          await this.showAction(req, res, id);
          break;
        case "new":
          await this.newAction(req, res);
          break;
        case "create":
          await this.createAction(req, res);
          break;
        case "edit":
          await this.editAction(req, res, id);
          break;
        case "update":
          await this.updateAction(req, res, id);
          break;
        default:
          res.status(404).send("Action not found");
      }
    } catch (error) {
      next(error);
    }
  }

  private async indexAction(req: Request, res: Response): Promise<void> {
    const users = await this.model.getData();
    this.view.setTemplate("user-list");
    const html = await this.view.render({ users });
    res.send(html);
  }

  private async showAction(
    req: Request,
    res: Response,
    id: string
  ): Promise<void> {
    const user = await (this.model as UserModel).getUserById(parseInt(id));
    if (!user) {
      res.status(404).send("User not found");
      return;
    }
    this.view.setTemplate("user-detail");
    const html = await this.view.render({ user });
    res.send(html);
  }

  private async newAction(req: Request, res: Response): Promise<void> {
    this.view.setTemplate("user-form");
    const html = await this.view.render({});
    res.send(html);
  }

  private async createAction(req: Request, res: Response): Promise<void> {
    const userData = req.body;
    const validation = this.model.validateData(userData);

    if (!validation.isValid) {
      this.view.setTemplate("user-form");
      const html = await this.view.render({
        user: userData,
        errors: validation.errors,
      });
      res.send(html);
      return;
    }

    await this.model.saveData(userData);
    res.redirect("/users");
  }

  private async editAction(
    req: Request,
    res: Response,
    id: string
  ): Promise<void> {
    const user = await (this.model as UserModel).getUserById(parseInt(id));
    if (!user) {
      res.status(404).send("User not found");
      return;
    }
    this.view.setTemplate("user-form");
    const html = await this.view.render({ user });
    res.send(html);
  }

  private async updateAction(
    req: Request,
    res: Response,
    id: string
  ): Promise<void> {
    const userData = { ...req.body, id: parseInt(id) };
    const validation = this.model.validateData(userData);

    if (!validation.isValid) {
      this.view.setTemplate("user-form");
      const html = await this.view.render({
        user: userData,
        errors: validation.errors,
      });
      res.send(html);
      return;
    }

    await this.model.saveData(userData);
    res.redirect(`/users/${id}`);
  }

  // ModelObserver 接口实现
  update(event: string, data?: any): void {
    console.log(`[UserController] Model event: ${event}`, data);
  }
}

// ======================== Page Controller 模式 ========================

/**
 * 页面控制器接口
 * 处理特定页面或操作的Web请求
 */
export interface PageController {
  /**
   * 处理GET请求
   */
  handleGet(req: Request, res: Response): Promise<void>;

  /**
   * 处理POST请求
   */
  handlePost(req: Request, res: Response): Promise<void>;

  /**
   * 处理PUT请求
   */
  handlePut?(req: Request, res: Response): Promise<void>;

  /**
   * 处理DELETE请求
   */
  handleDelete?(req: Request, res: Response): Promise<void>;
}

/**
 * 抽象页面控制器基类
 */
export abstract class AbstractPageController implements PageController {
  protected model: Model;
  protected view: View;

  constructor(model: Model, view: View) {
    this.model = model;
    this.view = view;
  }

  abstract handleGet(req: Request, res: Response): Promise<void>;
  abstract handlePost(req: Request, res: Response): Promise<void>;

  /**
   * 渲染视图
   */
  protected async renderView(res: Response, data: any): Promise<void> {
    try {
      const html = await this.view.render(data);
      res.send(html);
    } catch (error) {
      throw new ViewRenderException(
        "Failed to render view",
        this.view.getTemplate()
      );
    }
  }

  /**
   * 处理验证错误
   */
  protected async handleValidationErrors(
    res: Response,
    data: any,
    errors: string[]
  ): Promise<void> {
    await this.renderView(res, { ...data, errors });
  }
}

/**
 * 用户列表页面控制器
 */
export class UserListPageController extends AbstractPageController {
  async handleGet(req: Request, res: Response): Promise<void> {
    const users = await this.model.getData();
    this.view.setTemplate("user-list");
    await this.renderView(res, { users });
  }

  async handlePost(req: Request, res: Response): Promise<void> {
    // 用户列表页面不处理POST请求
    res.status(405).send("Method Not Allowed");
  }
}

/**
 * 用户表单页面控制器
 */
export class UserFormPageController extends AbstractPageController {
  async handleGet(req: Request, res: Response): Promise<void> {
    const id = req.params.id;
    let user = {};

    if (id) {
      user = (await (this.model as UserModel).getUserById(parseInt(id))) || {};
    }

    this.view.setTemplate("user-form");
    await this.renderView(res, { user });
  }

  async handlePost(req: Request, res: Response): Promise<void> {
    const userData = req.body;
    const validation = this.model.validateData(userData);

    if (!validation.isValid) {
      await this.handleValidationErrors(
        res,
        { user: userData },
        validation.errors
      );
      return;
    }

    await this.model.saveData(userData);
    res.redirect("/users");
  }
}

/**
 * 用户详情页面控制器
 */
export class UserDetailPageController extends AbstractPageController {
  async handleGet(req: Request, res: Response): Promise<void> {
    const id = req.params.id;
    const user = await (this.model as UserModel).getUserById(parseInt(id));

    if (!user) {
      res.status(404).send("User not found");
      return;
    }

    this.view.setTemplate("user-detail");
    await this.renderView(res, { user });
  }

  async handlePost(req: Request, res: Response): Promise<void> {
    // 用户详情页面不处理POST请求
    res.status(405).send("Method Not Allowed");
  }
}

// ======================== Front Controller 模式 ========================

/**
 * 前端控制器接口
 * 处理所有Web请求的中央入口点
 */
export interface FrontController {
  /**
   * 处理请求
   */
  handleRequest(req: Request, res: Response, next: NextFunction): Promise<void>;

  /**
   * 添加路由
   */
  addRoute(pattern: string, controller: any): void;

  /**
   * 添加中间件
   */
  addMiddleware(
    middleware: (req: Request, res: Response, next: NextFunction) => void
  ): void;
}

/**
 * 路由信息
 */
export interface RouteInfo {
  pattern: string;
  controller: any;
  params: { [key: string]: string };
}

/**
 * 前端控制器实现
 */
export class WebFrontController implements FrontController {
  private routes: Array<{
    pattern: RegExp;
    controller: any;
    paramNames: string[];
  }> = [];
  private middlewares: Array<
    (req: Request, res: Response, next: NextFunction) => void
  > = [];

  async handleRequest(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      // 执行中间件
      await this.executeMiddlewares(req, res, next);

      // 匹配路由
      const routeInfo = this.matchRoute(req.url);
      if (!routeInfo) {
        res.status(404).send("Not Found");
        return;
      }

      // 设置路由参数
      req.params = { ...req.params, ...routeInfo.params };

      // 执行控制器
      await this.executeController(routeInfo.controller, req, res, next);
    } catch (error) {
      next(error);
    }
  }

  addRoute(pattern: string, controller: any): void {
    const { regex, paramNames } = this.createRouteRegex(pattern);
    this.routes.push({ pattern: regex, controller, paramNames });
  }

  addMiddleware(
    middleware: (req: Request, res: Response, next: NextFunction) => void
  ): void {
    this.middlewares.push(middleware);
  }

  private async executeMiddlewares(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    for (const middleware of this.middlewares) {
      await new Promise<void>((resolve, reject) => {
        middleware(req, res, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    }
  }

  private matchRoute(url: string): RouteInfo | null {
    for (const route of this.routes) {
      const match = url.match(route.pattern);
      if (match) {
        const params: { [key: string]: string } = {};
        route.paramNames.forEach((name, index) => {
          params[name] = match[index + 1];
        });
        return {
          pattern: route.pattern.source,
          controller: route.controller,
          params,
        };
      }
    }
    return null;
  }

  private createRouteRegex(pattern: string): {
    regex: RegExp;
    paramNames: string[];
  } {
    const paramNames: string[] = [];
    const regexPattern = pattern.replace(/:([^/]+)/g, (match, paramName) => {
      paramNames.push(paramName);
      return "([^/]+)";
    });
    return { regex: new RegExp(`^${regexPattern}$`), paramNames };
  }

  private async executeController(
    controller: any,
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    if (typeof controller === "function") {
      await controller(req, res, next);
    } else if (controller && typeof controller.handleRequest === "function") {
      await controller.handleRequest(req, res, next);
    } else {
      throw new RoutingException("Invalid controller", req.url);
    }
  }
}

// ======================== Application Controller 模式 ========================

/**
 * 应用控制器接口
 * 处理屏幕导航和应用程序流程的中央控制点
 */
export interface ApplicationController {
  /**
   * 处理导航
   */
  handleNavigation(
    from: string,
    to: string,
    req: Request,
    res: Response
  ): Promise<void>;

  /**
   * 添加流程定义
   */
  addFlow(flowName: string, flowDefinition: FlowDefinition): void;

  /**
   * 获取下一个视图
   */
  getNextView(currentView: string, action: string, data?: any): string;
}

/**
 * 流程定义
 */
export interface FlowDefinition {
  name: string;
  steps: FlowStep[];
}

/**
 * 流程步骤
 */
export interface FlowStep {
  name: string;
  view: string;
  actions: { [actionName: string]: string }; // action -> next step
  condition?: (data: any) => boolean;
}

/**
 * 应用控制器实现
 */
export class WebApplicationController implements ApplicationController {
  private flows: Map<string, FlowDefinition> = new Map();
  private currentFlow: string | null = null;
  private currentStep: string | null = null;

  async handleNavigation(
    from: string,
    to: string,
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      // 确定当前流程
      const flowName = this.determineFlow(from, to);
      const flow = this.flows.get(flowName);

      if (!flow) {
        throw new RoutingException(`Flow not found: ${flowName}`, to);
      }

      // 查找目标步骤
      const step = flow.steps.find((s) => s.view === to);
      if (!step) {
        throw new RoutingException(`Step not found: ${to}`, to);
      }

      // 检查条件
      if (step.condition && !step.condition(req.body)) {
        throw new RoutingException(`Condition not met for step: ${to}`, to);
      }

      // 设置当前状态
      this.currentFlow = flowName;
      this.currentStep = step.name;

      // 重定向到目标视图
      res.redirect(to);
    } catch (error) {
      throw new RoutingException(`Navigation failed: ${from} -> ${to}`, to);
    }
  }

  addFlow(flowName: string, flowDefinition: FlowDefinition): void {
    this.flows.set(flowName, flowDefinition);
  }

  getNextView(currentView: string, action: string, data?: any): string {
    if (!this.currentFlow) {
      throw new RoutingException("No current flow", currentView);
    }

    const flow = this.flows.get(this.currentFlow);
    if (!flow) {
      throw new RoutingException(
        `Flow not found: ${this.currentFlow}`,
        currentView
      );
    }

    const currentStep = flow.steps.find((s) => s.view === currentView);
    if (!currentStep) {
      throw new RoutingException(`Step not found: ${currentView}`, currentView);
    }

    const nextStepName = currentStep.actions[action];
    if (!nextStepName) {
      throw new RoutingException(`Action not found: ${action}`, currentView);
    }

    const nextStep = flow.steps.find((s) => s.name === nextStepName);
    if (!nextStep) {
      throw new RoutingException(
        `Next step not found: ${nextStepName}`,
        currentView
      );
    }

    return nextStep.view;
  }

  private determineFlow(from: string, to: string): string {
    // 简单的流程确定逻辑
    if (from.includes("user") || to.includes("user")) {
      return "user-management";
    }
    if (from.includes("product") || to.includes("product")) {
      return "product-management";
    }
    if (from.includes("order") || to.includes("order")) {
      return "order-processing";
    }
    return "default";
  }
}

// ======================== 模式演示类 ========================

/**
 * MVC模式演示类
 */
export class MVCPatternsExample {
  private frontController: WebFrontController;
  private applicationController: WebApplicationController;

  constructor() {
    this.frontController = new WebFrontController();
    this.applicationController = new WebApplicationController();
    this.setupRoutes();
    this.setupFlows();
  }

  /**
   * 演示MVC模式
   */
  public async demonstrateMVCPatterns(): Promise<void> {
    console.log("=== MVC相关模式演示 ===");

    try {
      // 1. Model View Controller
      console.log("\n1. Model View Controller 模式:");
      await this.demonstrateMVC();

      // 2. Page Controller
      console.log("\n2. Page Controller 模式:");
      await this.demonstratePageController();

      // 3. Front Controller
      console.log("\n3. Front Controller 模式:");
      await this.demonstrateFrontController();

      // 4. Application Controller
      console.log("\n4. Application Controller 模式:");
      await this.demonstrateApplicationController();

      this.printMVCPatternsGuidelines();
    } catch (error) {
      console.error("MVC模式演示失败:", error);
    }
  }

  private async demonstrateMVC(): Promise<void> {
    // 创建MVC组件
    const model = new UserModel();
    const view = new HtmlView();
    const controller = new UserController(model, view);

    // 模拟请求
    const mockRequest = {
      params: { action: "create" },
      body: { name: "John Doe", email: "john@example.com" },
    } as Request;

    const mockResponse = {
      send: (content: string) =>
        console.log("✓ MVC响应:", content.substring(0, 100) + "..."),
      redirect: (url: string) => console.log("✓ MVC重定向:", url),
      status: (code: number) => ({
        send: (msg: string) => console.log(`✓ MVC状态 ${code}:`, msg),
      }),
    } as any;

    await controller.handleRequest(mockRequest, mockResponse, () => {});
  }

  private async demonstratePageController(): Promise<void> {
    const model = new UserModel();
    const view = new HtmlView();

    // 用户列表页面控制器
    const listController = new UserListPageController(model, view);

    // 用户表单页面控制器
    const formController = new UserFormPageController(model, view);

    const mockRequest = {} as Request;
    const mockResponse = {
      send: (content: string) =>
        console.log(
          "✓ Page Controller响应:",
          content.substring(0, 100) + "..."
        ),
    } as any;

    await listController.handleGet(mockRequest, mockResponse);
    console.log("✓ Page Controller - 用户列表页面处理完成");

    await formController.handleGet(mockRequest, mockResponse);
    console.log("✓ Page Controller - 用户表单页面处理完成");
  }

  private async demonstrateFrontController(): Promise<void> {
    // 添加中间件
    this.frontController.addMiddleware((req, res, next) => {
      console.log("✓ Front Controller中间件执行:", req.url);
      next();
    });

    // 模拟请求处理
    const mockRequest = { url: "/users/123" } as Request;
    const mockResponse = {
      status: (code: number) => ({
        send: (msg: string) =>
          console.log(`✓ Front Controller响应 ${code}:`, msg),
      }),
      redirect: (url: string) => console.log("✓ Front Controller重定向:", url),
    } as any;

    await this.frontController.handleRequest(
      mockRequest,
      mockResponse,
      () => {}
    );
  }

  private async demonstrateApplicationController(): Promise<void> {
    // 模拟导航
    const mockRequest = { body: { step: "form" } } as Request;
    const mockResponse = {
      redirect: (url: string) =>
        console.log("✓ Application Controller导航:", url),
    } as any;

    await this.applicationController.handleNavigation(
      "/users",
      "/users/new",
      mockRequest,
      mockResponse
    );
    console.log("✓ Application Controller - 导航处理完成");

    // 获取下一个视图
    const nextView = this.applicationController.getNextView(
      "/users/new",
      "submit"
    );
    console.log("✓ Application Controller - 下一个视图:", nextView);
  }

  private setupRoutes(): void {
    // 设置路由
    this.frontController.addRoute("/users", (req: Request, res: Response) => {
      console.log("✓ 处理用户列表路由");
      res.status(200);
    });

    this.frontController.addRoute(
      "/users/:id",
      (req: Request, res: Response) => {
        console.log("✓ 处理用户详情路由，ID:", req.params.id);
        res.status(200);
      }
    );

    this.frontController.addRoute(
      "/users/:id/edit",
      (req: Request, res: Response) => {
        console.log("✓ 处理用户编辑路由，ID:", req.params.id);
        res.status(200);
      }
    );
  }

  private setupFlows(): void {
    // 设置用户管理流程
    const userManagementFlow: FlowDefinition = {
      name: "user-management",
      steps: [
        {
          name: "list",
          view: "/users",
          actions: {
            new: "form",
            edit: "form",
            view: "detail",
          },
        },
        {
          name: "form",
          view: "/users/new",
          actions: {
            submit: "list",
            cancel: "list",
          },
        },
        {
          name: "detail",
          view: "/users/:id",
          actions: {
            edit: "form",
            back: "list",
          },
        },
      ],
    };

    this.applicationController.addFlow("user-management", userManagementFlow);
  }

  private printMVCPatternsGuidelines(): void {
    console.log(`
MVC相关模式使用指南：

1. Model View Controller (MVC)：
   - 分离关注点：模型(业务逻辑)、视图(表现)、控制器(协调)
   - 观察者模式：模型通知视图更新
   - 适用于复杂的用户界面
   - 提高代码可维护性和可测试性

2. Page Controller：
   - 每个页面/操作对应一个控制器
   - 简单直接的处理方式
   - 适合简单的Web应用
   - 容易理解和实现

3. Front Controller：
   - 所有请求的统一入口点
   - 集中处理安全、日志、路由等
   - 适合复杂的Web应用
   - 提供横切关注点的统一处理

4. Application Controller：
   - 管理应用程序的屏幕导航
   - 定义业务流程
   - 适合复杂的工作流应用
   - 提供流程控制和状态管理

选择指南：
- 简单应用：Page Controller
- 复杂应用：MVC + Front Controller
- 工作流应用：Application Controller + MVC
- 大型应用：组合使用多种模式

最佳实践：
- 保持控制器轻量级
- 将业务逻辑放在模型中
- 视图只负责显示
- 使用依赖注入减少耦合
- 提供良好的错误处理
- 考虑性能和可扩展性
    `);
  }
}
