/**
 * 商品服务单元测试
 * 
 * 测试商品相关的业务逻辑
 */

import { ProductService } from "../../domain/services/product.service";
import { ProductRepository } from "../../domain/repositories/product.repository";
import { CategoryRepository } from "../../domain/repositories/category.repository";
import { Product } from "../../domain/model/product";
import { Category } from "../../domain/model/category";

// Mock dependencies
jest.mock("../../domain/repositories/product.repository");
jest.mock("../../domain/repositories/category.repository");

describe("ProductService", () => {
  let productService: ProductService;
  let mockProductRepository: jest.Mocked<ProductRepository>;
  let mockCategoryRepository: jest.Mocked<CategoryRepository>;

  beforeEach(() => {
    mockProductRepository = {
      findById: jest.fn(),
      findByCategory: jest.fn(),
      findBySku: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findAll: jest.fn(),
      count: jest.fn(),
      search: jest.fn(),
    } as any;

    mockCategoryRepository = {
      findById: jest.fn(),
      findByName: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findAll: jest.fn(),
      count: jest.fn(),
    } as any;

    productService = new ProductService(mockProductRepository, mockCategoryRepository);
    jest.clearAllMocks();
  });

  describe("createProduct", () => {
    const validProductData = {
      name: "iPhone 15",
      description: "最新款iPhone",
      price: 7999.00,
      stock: 100,
      sku: "IPHONE15001",
      categoryId: "category-123",
    };

    it("应该成功创建商品", async () => {
      // Arrange
      const category = new Category("category-123", "电子产品", "电子设备");
      const expectedProduct = new Product(
        "product-123",
        validProductData.name,
        validProductData.description,
        validProductData.price,
        validProductData.stock,
        validProductData.sku,
        category
      );

      mockCategoryRepository.findById.mockResolvedValue(category);
      mockProductRepository.findBySku.mockResolvedValue(null);
      mockProductRepository.save.mockResolvedValue(expectedProduct);

      // Act
      const result = await productService.createProduct(validProductData);

      // Assert
      expect(result.success).toBe(true);
      expect(result.product).toBeDefined();
      expect(result.product!.name).toBe(validProductData.name);
      expect(mockCategoryRepository.findById).toHaveBeenCalledWith(validProductData.categoryId);
      expect(mockProductRepository.findBySku).toHaveBeenCalledWith(validProductData.sku);
      expect(mockProductRepository.save).toHaveBeenCalled();
    });

    it("应该拒绝不存在的分类", async () => {
      // Arrange
      mockCategoryRepository.findById.mockResolvedValue(null);

      // Act
      const result = await productService.createProduct(validProductData);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe("商品分类不存在");
      expect(mockProductRepository.save).not.toHaveBeenCalled();
    });

    it("应该拒绝重复的SKU", async () => {
      // Arrange
      const category = new Category("category-123", "电子产品", "电子设备");
      const existingProduct = new Product(
        "existing-product",
        "Existing Product",
        "Description",
        1000,
        50,
        validProductData.sku,
        category
      );

      mockCategoryRepository.findById.mockResolvedValue(category);
      mockProductRepository.findBySku.mockResolvedValue(existingProduct);

      // Act
      const result = await productService.createProduct(validProductData);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe("商品SKU已存在");
      expect(mockProductRepository.save).not.toHaveBeenCalled();
    });

    it("应该验证商品价格", async () => {
      // Arrange
      const invalidPriceData = {
        ...validProductData,
        price: -100,
      };

      // Act
      const result = await productService.createProduct(invalidPriceData);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain("价格必须大于0");
    });

    it("应该验证库存数量", async () => {
      // Arrange
      const invalidStockData = {
        ...validProductData,
        stock: -10,
      };

      // Act
      const result = await productService.createProduct(invalidStockData);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain("库存数量不能为负数");
    });
  });

  describe("updateProduct", () => {
    const productId = "product-123";
    const category = new Category("category-123", "电子产品", "电子设备");
    const existingProduct = new Product(
      productId,
      "iPhone 15",
      "最新款iPhone",
      7999.00,
      100,
      "IPHONE15001",
      category
    );

    it("应该成功更新商品", async () => {
      // Arrange
      const updateData = {
        name: "iPhone 15 Pro",
        price: 8999.00,
        stock: 80,
      };

      mockProductRepository.findById.mockResolvedValue(existingProduct);
      mockProductRepository.update.mockResolvedValue({
        ...existingProduct,
        ...updateData,
      } as Product);

      // Act
      const result = await productService.updateProduct(productId, updateData);

      // Assert
      expect(result.success).toBe(true);
      expect(result.product).toBeDefined();
      expect(result.product!.name).toBe(updateData.name);
      expect(result.product!.price).toBe(updateData.price);
      expect(mockProductRepository.findById).toHaveBeenCalledWith(productId);
      expect(mockProductRepository.update).toHaveBeenCalled();
    });

    it("应该拒绝更新不存在的商品", async () => {
      // Arrange
      mockProductRepository.findById.mockResolvedValue(null);

      // Act
      const result = await productService.updateProduct(productId, { name: "Updated" });

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe("商品不存在");
      expect(mockProductRepository.update).not.toHaveBeenCalled();
    });

    it("应该验证更新数据", async () => {
      // Arrange
      mockProductRepository.findById.mockResolvedValue(existingProduct);

      // Act
      const result = await productService.updateProduct(productId, { price: -100 });

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain("价格必须大于0");
      expect(mockProductRepository.update).not.toHaveBeenCalled();
    });
  });

  describe("getProductById", () => {
    const productId = "product-123";
    const category = new Category("category-123", "电子产品", "电子设备");
    const existingProduct = new Product(
      productId,
      "iPhone 15",
      "最新款iPhone",
      7999.00,
      100,
      "IPHONE15001",
      category
    );

    it("应该成功获取商品信息", async () => {
      // Arrange
      mockProductRepository.findById.mockResolvedValue(existingProduct);

      // Act
      const result = await productService.getProductById(productId);

      // Assert
      expect(result.success).toBe(true);
      expect(result.product).toBeDefined();
      expect(result.product!.id).toBe(productId);
      expect(mockProductRepository.findById).toHaveBeenCalledWith(productId);
    });

    it("应该处理商品不存在的情况", async () => {
      // Arrange
      mockProductRepository.findById.mockResolvedValue(null);

      // Act
      const result = await productService.getProductById(productId);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe("商品不存在");
    });
  });

  describe("searchProducts", () => {
    it("应该支持商品搜索", async () => {
      // Arrange
      const searchQuery = "iPhone";
      const category = new Category("category-123", "电子产品", "电子设备");
      const products = [
        new Product("product-1", "iPhone 15", "描述1", 7999, 100, "SKU1", category),
        new Product("product-2", "iPhone 15 Pro", "描述2", 8999, 80, "SKU2", category),
      ];

      mockProductRepository.search.mockResolvedValue(products);

      // Act
      const result = await productService.searchProducts(searchQuery);

      // Assert
      expect(result.success).toBe(true);
      expect(result.products).toHaveLength(2);
      expect(mockProductRepository.search).toHaveBeenCalledWith(searchQuery, undefined, undefined);
    });

    it("应该支持分页搜索", async () => {
      // Arrange
      const searchQuery = "iPhone";
      mockProductRepository.search.mockResolvedValue([]);

      // Act
      await productService.searchProducts(searchQuery, 10, 20);

      // Assert
      expect(mockProductRepository.search).toHaveBeenCalledWith(searchQuery, 10, 20);
    });
  });

  describe("getProductsByCategory", () => {
    const categoryId = "category-123";

    it("应该根据分类获取商品", async () => {
      // Arrange
      const category = new Category(categoryId, "电子产品", "电子设备");
      const products = [
        new Product("product-1", "iPhone 15", "描述1", 7999, 100, "SKU1", category),
        new Product("product-2", "MacBook Pro", "描述2", 15999, 20, "SKU2", category),
      ];

      mockCategoryRepository.findById.mockResolvedValue(category);
      mockProductRepository.findByCategory.mockResolvedValue(products);

      // Act
      const result = await productService.getProductsByCategory(categoryId);

      // Assert
      expect(result.success).toBe(true);
      expect(result.products).toHaveLength(2);
      expect(mockCategoryRepository.findById).toHaveBeenCalledWith(categoryId);
      expect(mockProductRepository.findByCategory).toHaveBeenCalledWith(categoryId);
    });

    it("应该处理分类不存在的情况", async () => {
      // Arrange
      mockCategoryRepository.findById.mockResolvedValue(null);

      // Act
      const result = await productService.getProductsByCategory(categoryId);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe("商品分类不存在");
    });
  });

  describe("updateStock", () => {
    const productId = "product-123";
    const category = new Category("category-123", "电子产品", "电子设备");
    const existingProduct = new Product(
      productId,
      "iPhone 15",
      "最新款iPhone",
      7999.00,
      100,
      "IPHONE15001",
      category
    );

    it("应该成功更新库存", async () => {
      // Arrange
      const newStock = 150;
      mockProductRepository.findById.mockResolvedValue(existingProduct);
      mockProductRepository.update.mockResolvedValue({
        ...existingProduct,
        stock: newStock,
      } as Product);

      // Act
      const result = await productService.updateStock(productId, newStock);

      // Assert
      expect(result.success).toBe(true);
      expect(result.product!.stock).toBe(newStock);
      expect(mockProductRepository.update).toHaveBeenCalled();
    });

    it("应该拒绝负数库存", async () => {
      // Arrange
      mockProductRepository.findById.mockResolvedValue(existingProduct);

      // Act
      const result = await productService.updateStock(productId, -10);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain("库存数量不能为负数");
      expect(mockProductRepository.update).not.toHaveBeenCalled();
    });
  });

  describe("deleteProduct", () => {
    const productId = "product-123";
    const category = new Category("category-123", "电子产品", "电子设备");
    const existingProduct = new Product(
      productId,
      "iPhone 15",
      "最新款iPhone",
      7999.00,
      100,
      "IPHONE15001",
      category
    );

    it("应该成功删除商品", async () => {
      // Arrange
      mockProductRepository.findById.mockResolvedValue(existingProduct);
      mockProductRepository.delete.mockResolvedValue(undefined);

      // Act
      const result = await productService.deleteProduct(productId);

      // Assert
      expect(result.success).toBe(true);
      expect(mockProductRepository.findById).toHaveBeenCalledWith(productId);
      expect(mockProductRepository.delete).toHaveBeenCalledWith(productId);
    });

    it("应该拒绝删除不存在的商品", async () => {
      // Arrange
      mockProductRepository.findById.mockResolvedValue(null);

      // Act
      const result = await productService.deleteProduct(productId);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe("商品不存在");
      expect(mockProductRepository.delete).not.toHaveBeenCalled();
    });
  });

  describe("边界条件和错误处理", () => {
    it("应该处理空的商品数据", async () => {
      // Act
      const result = await productService.createProduct({} as any);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain("必填字段");
    });

    it("应该处理数据库连接错误", async () => {
      // Arrange
      mockCategoryRepository.findById.mockRejectedValue(new Error("Connection error"));

      // Act
      const result = await productService.createProduct({
        name: "Test Product",
        description: "Test Description",
        price: 100,
        stock: 10,
        sku: "TEST001",
        categoryId: "category-123",
      });

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain("服务暂时不可用");
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });
});