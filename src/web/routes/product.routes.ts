/**
 * 产品路由
 * 演示产品相关的路由配置
 */

import { Router } from "express";
import { ProductController } from "../controllers/product.controller";
import { requireAuth, requireRole } from "../middleware/auth";
import { csrfProtection } from "../middleware/csrf";
import { rateLimiter } from "../middleware/rate-limiter";

const productController = new ProductController();
const router = Router();

// 公开路由
router.get("/", productController.productList);
router.get("/:id", productController.productDetail);

// 管理员路由
router.get(
  "/admin/products",
  requireAuth,
  requireRole(["admin", "manager"]),
  productController.adminProductList
);

router.get(
  "/admin/products/create",
  requireAuth,
  requireRole(["admin", "manager"]),
  productController.createProductPage
);

router.post(
  "/admin/products",
  requireAuth,
  requireRole(["admin", "manager"]),
  csrfProtection,
  productController.createProduct
);

router.get(
  "/admin/products/:id/edit",
  requireAuth,
  requireRole(["admin", "manager"]),
  productController.editProductPage
);

router.post(
  "/admin/products/:id",
  requireAuth,
  requireRole(["admin", "manager"]),
  csrfProtection,
  productController.updateProduct
);

// API 路由
router.get(
  "/api/search",
  rateLimiter.apiLimiter,
  productController.apiSearchProducts
);

router.get(
  "/api/products/:id/stock",
  rateLimiter.apiLimiter,
  productController.apiGetStock
);

export default router;
