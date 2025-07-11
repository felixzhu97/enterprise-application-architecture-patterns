/**
 * 用户路由
 * 演示路由配置和控制器集成
 */

import { Router } from "express";
import { UserController } from "../controllers/user.controller";
import { requireAuth, requireRole } from "../middleware/auth";
import { csrfProtection } from "../middleware/csrf";
import { rateLimiter } from "../middleware/rate-limiter";

// 依赖注入容器（简化实现）
const userController = new UserController(
  // 这里应该注入实际的服务实例
  null as any,
  null as any
);

const router: Router = Router();

// 公开路由
router.get("/register", userController.registerPage);
router.post(
  "/register",
  csrfProtection,
  rateLimiter.createAccountLimiter,
  userController.register
);

router.get("/login", userController.loginPage);
router.post(
  "/login",
  csrfProtection,
  rateLimiter.loginLimiter,
  userController.login
);

router.post("/logout", userController.logout);

router.get("/verify-email", userController.verifyEmail);

router.get("/forgot-password", userController.forgotPasswordPage);
router.post(
  "/forgot-password",
  csrfProtection,
  rateLimiter.passwordResetLimiter,
  userController.sendResetPassword
);

// 需要认证的路由
router.get("/profile", requireAuth, userController.profile);
router.post(
  "/profile",
  requireAuth,
  csrfProtection,
  userController.updateProfile
);

// 管理员路由
router.get(
  "/admin/users",
  requireAuth,
  requireRole("admin"),
  userController.userList
);

// API 路由
router.get("/api/users/:id", requireAuth, userController.apiGetUser);

export default router;
