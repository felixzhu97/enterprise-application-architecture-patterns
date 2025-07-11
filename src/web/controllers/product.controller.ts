/**
 * 产品控制器
 * 演示 Page Controller 模式
 */

import { Request, Response } from "express";
import { WebController } from "../../patterns/base/layer-supertype";
import { BusinessError, ValidationError } from "../middleware/error-handler";

/**
 * 产品控制器
 * 处理产品相关的HTTP请求
 */
export class ProductController extends WebController {
  constructor() {
    super();
  }

  /**
   * 产品列表页面
   */
  productList = this.asyncHandler(async (req: Request, res: Response) => {
    return this.handleRequest(req, res, "productList", async () => {
      const page = parseInt(req.query.page as string) || 1;
      const category = req.query.category as string;
      const search = req.query.search as string;
      const priceMin = req.query.priceMin
        ? parseFloat(req.query.priceMin as string)
        : undefined;
      const priceMax = req.query.priceMax
        ? parseFloat(req.query.priceMax as string)
        : undefined;

      // 模拟产品数据
      const products = [
        {
          id: "1",
          name: "iPhone 15 Pro",
          description: "最新款iPhone，配备A17 Pro芯片",
          price: { amount: 7999, currency: "CNY" },
          category: "手机",
          imageUrl: "/images/products/iphone-15-pro.jpg",
          stock: 50,
          isActive: true,
        },
        {
          id: "2",
          name: "MacBook Pro 14寸",
          description: "搭载M3芯片的专业笔记本",
          price: { amount: 14999, currency: "CNY" },
          category: "电脑",
          imageUrl: "/images/products/macbook-pro-14.jpg",
          stock: 25,
          isActive: true,
        },
      ];

      res.render("products/list", {
        title: "产品列表",
        products,
        filters: { category, search, priceMin, priceMax },
        pagination: {
          current: page,
          total: 10,
          pageSize: 12,
        },
      });
    });
  });

  /**
   * 产品详情页面
   */
  productDetail = this.asyncHandler(async (req: Request, res: Response) => {
    return this.handleRequest(req, res, "productDetail", async () => {
      const productId = req.params.id;

      // 模拟产品详情数据
      const product = {
        id: productId,
        name: "iPhone 15 Pro",
        description: "最新款iPhone，配备A17 Pro芯片，支持USB-C接口",
        price: { amount: 7999, currency: "CNY" },
        category: { id: "1", name: "手机" },
        images: [
          "/images/products/iphone-15-pro-1.jpg",
          "/images/products/iphone-15-pro-2.jpg",
        ],
        specifications: {
          屏幕尺寸: "6.1英寸",
          处理器: "A17 Pro",
          存储: "128GB",
          相机: "48MP主摄",
        },
        stock: 50,
        sku: "IP15P-128-TBL",
        isActive: true,
      };

      res.render("products/detail", {
        title: product.name,
        product,
        relatedProducts: [],
        cartForm: {
          csrfToken: req.csrfToken?.(),
        },
      });
    });
  });

  /**
   * 产品管理页面（管理员）
   */
  adminProductList = this.asyncHandler(async (req: Request, res: Response) => {
    return this.handleRequest(req, res, "adminProductList", async () => {
      // 检查管理员权限
      this.requireAdminRole(req);

      const page = parseInt(req.query.page as string) || 1;
      const status = req.query.status as string;

      // 模拟管理员产品列表
      const products = [
        {
          id: "1",
          name: "iPhone 15 Pro",
          sku: "IP15P-128-TBL",
          category: "手机",
          price: 7999,
          stock: 50,
          status: "active",
          createdAt: new Date("2024-01-01"),
          updatedAt: new Date("2024-01-15"),
        },
      ];

      res.render("admin/products/list", {
        title: "产品管理",
        products,
        pagination: {
          current: page,
          total: 5,
          pageSize: 20,
        },
        filters: { status },
      });
    });
  });

  /**
   * 创建产品页面
   */
  createProductPage = this.asyncHandler(async (req: Request, res: Response) => {
    return this.handleRequest(req, res, "createProductPage", async () => {
      this.requireAdminRole(req);

      const categories = [
        { id: "1", name: "手机" },
        { id: "2", name: "电脑" },
        { id: "3", name: "配件" },
      ];

      res.render("admin/products/create", {
        title: "新增产品",
        categories,
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
   * 创建产品
   */
  createProduct = this.asyncHandler(async (req: Request, res: Response) => {
    return this.handleRequest(req, res, "createProduct", async () => {
      this.requireAdminRole(req);

      const productData = {
        name: req.body.name,
        description: req.body.description,
        price: parseFloat(req.body.price),
        categoryId: req.body.categoryId,
        sku: req.body.sku,
        stock: parseInt(req.body.stock),
        specifications: req.body.specifications,
      };

      // 验证产品数据
      this.validateProductData(productData);

      try {
        // 这里应该调用产品服务来创建产品
        // const product = await this.productService.createProduct(productData);

        req.flash("success", "产品创建成功！");
        res.redirect("/admin/products");
      } catch (error) {
        req.flash("errors", [(error as Error).message]);
        req.flash("formData", JSON.stringify(productData));
        res.redirect("/admin/products/create");
      }
    });
  });

  /**
   * 编辑产品页面
   */
  editProductPage = this.asyncHandler(async (req: Request, res: Response) => {
    return this.handleRequest(req, res, "editProductPage", async () => {
      this.requireAdminRole(req);

      const productId = req.params.id;

      // 模拟产品数据
      const product = {
        id: productId,
        name: "iPhone 15 Pro",
        description: "最新款iPhone",
        price: 7999,
        categoryId: "1",
        sku: "IP15P-128-TBL",
        stock: 50,
        specifications: {
          屏幕尺寸: "6.1英寸",
          处理器: "A17 Pro",
        },
        isActive: true,
      };

      const categories = [
        { id: "1", name: "手机" },
        { id: "2", name: "电脑" },
      ];

      res.render("admin/products/edit", {
        title: "编辑产品",
        product,
        categories,
        csrfToken: req.csrfToken?.(),
        errors: req.flash("errors"),
        success: req.flash("success"),
      });
    });
  });

  /**
   * 更新产品
   */
  updateProduct = this.asyncHandler(async (req: Request, res: Response) => {
    return this.handleRequest(req, res, "updateProduct", async () => {
      this.requireAdminRole(req);

      const productId = req.params.id;
      const updateData = {
        name: req.body.name,
        description: req.body.description,
        price: parseFloat(req.body.price),
        categoryId: req.body.categoryId,
        stock: parseInt(req.body.stock),
        isActive: req.body.isActive === "true",
      };

      this.validateProductData(updateData);

      try {
        // 这里应该调用产品服务来更新产品
        // await this.productService.updateProduct(productId, updateData);

        req.flash("success", "产品更新成功！");
        res.redirect(`/admin/products/${productId}/edit`);
      } catch (error) {
        req.flash("errors", [(error as Error).message]);
        res.redirect(`/admin/products/${productId}/edit`);
      }
    });
  });

  /**
   * API: 搜索产品
   */
  apiSearchProducts = this.asyncHandler(async (req: Request, res: Response) => {
    return this.handleRequest(req, res, "apiSearchProducts", async () => {
      const query = req.query.q as string;
      const limit = parseInt(req.query.limit as string) || 10;

      if (!query || query.length < 2) {
        throw new ValidationError("搜索关键词至少需要2个字符");
      }

      // 模拟搜索结果
      const products = [
        {
          id: "1",
          name: "iPhone 15 Pro",
          price: 7999,
          imageUrl: "/images/products/iphone-15-pro-thumb.jpg",
        },
      ].filter((p) => p.name.toLowerCase().includes(query.toLowerCase()));

      res.json({
        success: true,
        data: products.slice(0, limit),
        total: products.length,
      });
    });
  });

  /**
   * API: 获取产品库存
   */
  apiGetStock = this.asyncHandler(async (req: Request, res: Response) => {
    return this.handleRequest(req, res, "apiGetStock", async () => {
      const productId = req.params.id;

      // 模拟库存数据
      const stock = {
        productId,
        available: 45,
        reserved: 5,
        total: 50,
      };

      res.json({
        success: true,
        data: stock,
      });
    });
  });

  /**
   * 验证产品数据
   */
  private validateProductData(data: any): void {
    const errors: string[] = [];

    if (!data.name || data.name.trim().length < 2) {
      errors.push("产品名称至少需要2个字符");
    }

    if (!data.description || data.description.trim().length < 10) {
      errors.push("产品描述至少需要10个字符");
    }

    if (!data.price || data.price <= 0) {
      errors.push("请输入有效的产品价格");
    }

    if (!data.categoryId) {
      errors.push("请选择产品分类");
    }

    if (data.stock !== undefined && (isNaN(data.stock) || data.stock < 0)) {
      errors.push("请输入有效的库存数量");
    }

    if (errors.length > 0) {
      throw new ValidationError(errors.join(", "));
    }
  }

  /**
   * 检查管理员权限
   */
  private requireAdminRole(req: Request): void {
    const userRole = req.session?.user?.role;

    if (!userRole || (userRole !== "admin" && userRole !== "manager")) {
      throw new BusinessError("权限不足", 403);
    }
  }
}
