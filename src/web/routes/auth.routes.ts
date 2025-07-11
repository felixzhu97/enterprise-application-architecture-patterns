/**
 * 认证路由
 * 演示认证相关的API路由
 */

import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { csrfProtection } from "../middleware/csrf";
import { rateLimiter } from "../middleware/rate-limiter";

const router: Router = Router();

// 登录API
router.post("/login", csrfProtection, (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({
      success: false,
      message: "用户名和密码不能为空",
    });
  }

  // 简化的登录逻辑
  if (username === "admin" && password === "admin123") {
    if (req.session) {
      req.session.user = {
        id: "1",
        username: "admin",
        email: "admin@example.com",
        role: "admin",
      };
    }

    res.json({
      success: true,
      message: "登录成功",
      user: {
        id: "1",
        username: "admin",
        role: "admin",
      },
    });
  } else {
    res.status(401).json({
      success: false,
      message: "用户名或密码错误",
    });
  }
});

// 登出API
router.post("/logout", requireAuth, (req, res) => {
  if (req.session) {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({
          success: false,
          message: "登出失败",
        });
      }

      res.json({
        success: true,
        message: "登出成功",
      });
    });
  } else {
    res.json({
      success: true,
      message: "已登出",
    });
  }
});

// 获取当前用户信息
router.get("/me", requireAuth, (req, res) => {
  res.json({
    success: true,
    user: req.session?.user,
  });
});

// 刷新令牌
router.post("/refresh", requireAuth, (req, res) => {
  res.json({
    success: true,
    message: "令牌已刷新",
    token: "mock-refresh-token",
  });
});

export default router;
