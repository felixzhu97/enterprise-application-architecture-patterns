/**
 * 订单路由
 * 演示订单相关的路由配置
 */

import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth";
import { csrfProtection } from "../middleware/csrf";
import { rateLimiter } from "../middleware/rate-limiter";

const router: Router = Router();

// 需要认证的路由
router.get("/", requireAuth, (req, res) => {
  res.render("orders/list", {
    title: "我的订单",
    user: req.session?.user,
  });
});

router.get("/:id", requireAuth, (req, res) => {
  const orderId = req.params.id;
  res.render("orders/detail", {
    title: "订单详情",
    orderId,
    user: req.session?.user,
  });
});

// 创建订单
router.post("/", requireAuth, csrfProtection, (req, res) => {
  res.json({
    success: true,
    message: "订单创建成功",
    orderId: "mock-order-id",
  });
});

// 管理员路由
router.get("/admin/orders", requireAuth, requireRole("admin"), (req, res) => {
  res.render("admin/orders", {
    title: "订单管理",
    user: req.session?.user,
  });
});

export default router;
