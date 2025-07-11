/**
 * 用户控制器
 * 演示 Page Controller 模式
 *
 * 每个控制器负责特定页面/功能区域的业务逻辑
 */

import { Request, Response, NextFunction } from "express";
import {
  UserDomainService,
  UserRegistrationData,
} from "../../domain/services/user.service";
import { UserRepository } from "../../domain/repositories/user.repository";
import { WebController } from "../../patterns/base/layer-supertype";
import { BusinessError, ValidationError } from "../middleware/error-handler";

/**
 * 用户控制器
 * 处理用户相关的HTTP请求
 */
export class UserController extends WebController {
  constructor(
    private userService: UserDomainService,
    private userRepository: UserRepository
  ) {
    super();
  }

  /**
   * 用户注册页面
   */
  registerPage = this.asyncHandler(async (req: Request, res: Response) => {
    return this.handleRequest(req, res, "registerPage", async () => {
      res.render("users/register", {
        title: "用户注册",
        csrfToken: req.csrfToken?.(),
        errors: req.flash("errors"),
        formData:
          req.flash("formData").length > 0
            ? JSON.parse(req.flash("formData")[0])
            : {},
      });
    });
  });

  /**
   * 处理用户注册
   */
  register = this.asyncHandler(async (req: Request, res: Response) => {
    return this.handleRequest(req, res, "register", async () => {
      const registrationData: UserRegistrationData = {
        username: req.body.username,
        email: req.body.email,
        password: req.body.password,
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        phone: req.body.phone,
      };

      // 验证输入数据
      this.validateRegistrationData(registrationData, req.body.confirmPassword);

      try {
        const user = await this.userService.registerUser(registrationData);

        req.flash("success", "注册成功！请检查您的邮箱进行验证。");
        res.redirect("/login");
      } catch (error) {
        req.flash("errors", [(error as Error).message]);
        req.flash("formData", JSON.stringify(registrationData));
        res.redirect("/register");
      }
    });
  });

  /**
   * 登录页面
   */
  loginPage = this.asyncHandler(async (req: Request, res: Response) => {
    return this.handleRequest(req, res, "loginPage", async () => {
      res.render("users/login", {
        title: "用户登录",
        csrfToken: req.csrfToken?.(),
        errors: req.flash("errors"),
        success: req.flash("success"),
        returnUrl: req.query.returnUrl || "/",
      });
    });
  });

  /**
   * 处理用户登录
   */
  login = this.asyncHandler(async (req: Request, res: Response) => {
    return this.handleRequest(req, res, "login", async () => {
      const { username, password } = req.body;
      const returnUrl = req.body.returnUrl || "/";

      if (!username || !password) {
        req.flash("errors", ["请输入用户名和密码"]);
        res.redirect("/login");
        return;
      }

      const result = await this.userService.authenticateUser(
        username,
        password
      );

      if (!result.success) {
        req.flash("errors", [result.message || "登录失败"]);
        res.redirect("/login");
        return;
      }

      // 设置会话
      if (req.session) {
        req.session.user = {
          id: result.user!.getId(),
          username: result.user!.username,
          email: result.user!.email,
          role: result.user!.role,
        };
      }

      req.flash("success", "登录成功！");
      res.redirect(returnUrl);
    });
  });

  /**
   * 用户登出
   */
  logout = this.asyncHandler(async (req: Request, res: Response) => {
    return this.handleRequest(req, res, "logout", async () => {
      if (req.session) {
        req.session.destroy((err) => {
          if (err) {
            console.error("登出时销毁会话失败:", err);
          }
        });
      }

      req.flash("success", "已成功登出");
      res.redirect("/");
    });
  });

  /**
   * 用户个人资料页面
   */
  profile = this.asyncHandler(async (req: Request, res: Response) => {
    return this.handleRequest(req, res, "profile", async () => {
      const userId = req.session?.user?.id;

      if (!userId) {
        res.redirect("/login?returnUrl=/profile");
        return;
      }

      const user = await this.userRepository.findById(userId);

      if (!user) {
        throw new BusinessError("用户不存在", 404);
      }

      res.render("users/profile", {
        title: "个人资料",
        user: {
          id: user.getId(),
          username: user.username,
          email: user.email,
          firstName: user.profile.firstName,
          lastName: user.profile.lastName,
          phone: user.profile.phone,
          avatar: user.profile.avatar,
          emailVerified: user.emailVerified,
          status: user.status,
          role: user.role,
          createdAt: user.getCreatedAt(),
        },
        errors: req.flash("errors"),
        success: req.flash("success"),
      });
    });
  });

  /**
   * 更新用户资料
   */
  updateProfile = this.asyncHandler(async (req: Request, res: Response) => {
    return this.handleRequest(req, res, "updateProfile", async () => {
      const userId = req.session?.user?.id;

      if (!userId) {
        res.redirect("/login");
        return;
      }

      const user = await this.userRepository.findById(userId);

      if (!user) {
        throw new BusinessError("用户不存在", 404);
      }

      try {
        // 更新用户资料
        user.updateProfile({
          firstName: req.body.firstName,
          lastName: req.body.lastName,
          phone: req.body.phone,
          avatar: req.body.avatar,
          dateOfBirth: req.body.dateOfBirth
            ? new Date(req.body.dateOfBirth)
            : undefined,
        });

        await this.userRepository.save(user);

        req.flash("success", "资料更新成功！");
        res.redirect("/profile");
      } catch (error) {
        req.flash("errors", [(error as Error).message]);
        res.redirect("/profile");
      }
    });
  });

  /**
   * 用户列表页面（管理员）
   */
  userList = this.asyncHandler(async (req: Request, res: Response) => {
    return this.handleRequest(req, res, "userList", async () => {
      // 检查管理员权限
      this.requireRole(req, "admin");

      const page = parseInt(req.query.page as string) || 1;
      const pageSize = parseInt(req.query.pageSize as string) || 20;
      const status = req.query.status as string;
      const role = req.query.role as string;
      const search = req.query.search as string;

      let users;
      if (search) {
        users = {
          items: await this.userRepository.search(search, pageSize),
          total: 0, // 简化实现
          page: 1,
          pageSize,
          totalPages: 1,
        };
      } else {
        users = await this.userRepository.findPaginated(page, pageSize, {
          status,
          role,
        });
      }

      res.render("users/list", {
        title: "用户管理",
        users: users.items.map((user) => ({
          id: user.getId(),
          username: user.username,
          email: user.email,
          fullName: `${user.profile.firstName} ${user.profile.lastName}`,
          status: user.status,
          role: user.role,
          emailVerified: user.emailVerified,
          createdAt: user.getCreatedAt(),
          lastLoginAt: user.lastLoginAt,
        })),
        pagination: {
          current: users.page,
          total: users.totalPages,
          pageSize: users.pageSize,
          totalItems: users.total,
        },
        filters: { status, role, search },
      });
    });
  });

  /**
   * 邮箱验证
   */
  verifyEmail = this.asyncHandler(async (req: Request, res: Response) => {
    return this.handleRequest(req, res, "verifyEmail", async () => {
      const { userId, token } = req.query;

      if (!userId || !token) {
        throw new ValidationError("缺少验证参数");
      }

      const success = await this.userService.verifyEmail(
        userId as string,
        token as string
      );

      if (success) {
        req.flash("success", "邮箱验证成功！");
        res.redirect("/login");
      } else {
        req.flash("errors", ["邮箱验证失败，请重试"]);
        res.redirect("/");
      }
    });
  });

  /**
   * 忘记密码页面
   */
  forgotPasswordPage = this.asyncHandler(
    async (req: Request, res: Response) => {
      return this.handleRequest(req, res, "forgotPasswordPage", async () => {
        res.render("users/forgot-password", {
          title: "重置密码",
          csrfToken: req.csrfToken?.(),
          errors: req.flash("errors"),
          success: req.flash("success"),
        });
      });
    }
  );

  /**
   * 发送重置密码邮件
   */
  sendResetPassword = this.asyncHandler(async (req: Request, res: Response) => {
    return this.handleRequest(req, res, "sendResetPassword", async () => {
      const { email } = req.body;

      if (!email || !this.isValidEmail(email)) {
        req.flash("errors", ["请输入有效的邮箱地址"]);
        res.redirect("/forgot-password");
        return;
      }

      await this.userService.resetPassword(email);

      req.flash("success", "重置密码邮件已发送，请查收您的邮箱");
      res.redirect("/forgot-password");
    });
  });

  /**
   * API: 获取用户信息
   */
  apiGetUser = this.asyncHandler(async (req: Request, res: Response) => {
    return this.handleRequest(req, res, "apiGetUser", async () => {
      const userId = req.params.id;
      const user = await this.userRepository.findById(userId);

      if (!user) {
        throw new BusinessError("用户不存在", 404);
      }

      res.json({
        success: true,
        data: {
          id: user.getId(),
          username: user.username,
          email: user.email,
          profile: {
            firstName: user.profile.firstName,
            lastName: user.profile.lastName,
            phone: user.profile.phone,
            avatar: user.profile.avatar,
          },
          status: user.status,
          role: user.role,
          emailVerified: user.emailVerified,
          createdAt: user.getCreatedAt(),
          updatedAt: user.getUpdatedAt(),
        },
      });
    });
  });

  /**
   * 验证注册数据
   */
  private validateRegistrationData(
    data: UserRegistrationData,
    confirmPassword: string
  ): void {
    const errors: string[] = [];

    if (!data.username || data.username.length < 3) {
      errors.push("用户名至少需要3个字符");
    }

    if (!data.email || !this.isValidEmail(data.email)) {
      errors.push("请输入有效的邮箱地址");
    }

    if (!data.password || data.password.length < 8) {
      errors.push("密码至少需要8个字符");
    }

    if (data.password !== confirmPassword) {
      errors.push("密码确认不匹配");
    }

    if (!data.firstName || !data.lastName) {
      errors.push("请输入姓名");
    }

    if (errors.length > 0) {
      throw new ValidationError(errors.join(", "));
    }
  }

  /**
   * 验证邮箱格式
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * 检查用户角色权限
   */
  private requireRole(req: Request, requiredRole: string): void {
    const userRole = req.session?.user?.role;

    if (!userRole || userRole !== requiredRole) {
      throw new BusinessError("权限不足", 403);
    }
  }
}
