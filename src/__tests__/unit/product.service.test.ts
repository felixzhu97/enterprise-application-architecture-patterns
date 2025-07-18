/**
 * 商品服务单元测试
 *
 * 测试商品相关的业务逻辑
 */

import { describe, it, expect, beforeEach } from "vitest";
import { ProductService } from "../../patterns/domain/special-case";

describe("ProductService", () => {
  let productService: ProductService;

  beforeEach(() => {
    productService = new ProductService();
  });

  describe("findProductById", () => {
    it("应该找到正常产品", () => {
      // Act
      const product = productService.findProductById("p1");

      // Assert
      expect(product).toBeDefined();
      expect(product.getName()).toBe("iPhone 15");
      expect(product.getPrice()).toBe(5999);
      expect(product.getStock()).toBe(10);
      expect(product.isAvailable()).toBe(true);
      expect(product.canPurchase(2)).toBe(true);
    });

    it("应该处理缺货产品", () => {
      // Act
      const product = productService.findProductById("p2");

      // Assert
      expect(product).toBeDefined();
      expect(product.getName()).toBe("MacBook Pro (缺货)");
      expect(product.getPrice()).toBe(15999);
      expect(product.getStock()).toBe(0);
      expect(product.isAvailable()).toBe(false);
      expect(product.canPurchase(1)).toBe(false);
    });

    it("应该处理免费产品", () => {
      // Act
      const product = productService.findProductById("free1");

      // Assert
      expect(product).toBeDefined();
      expect(product.getName()).toBe("免费电子书");
      expect(product.getPrice()).toBe(0);
      expect(product.getFormattedPrice()).toBe("免费");
      expect(product.canPurchase(100)).toBe(true);
    });

    it("应该处理不存在的产品", () => {
      // Act
      const product = productService.findProductById("nonexistent");

      // Assert
      expect(product).toBeDefined();
      expect(product.getName()).toBe("产品未找到");
      expect(product.getPrice()).toBe(0);
      expect(product.getStock()).toBe(0);
      expect(product.isAvailable()).toBe(false);
      expect(product.canPurchase(1)).toBe(false);
    });
  });

  describe("canPurchaseProduct", () => {
    it("应该允许购买有库存的产品", () => {
      // Act
      const canPurchase = productService.canPurchaseProduct("p1", 2);

      // Assert
      expect(canPurchase).toBe(true);
    });

    it("应该拒绝购买缺货产品", () => {
      // Act
      const canPurchase = productService.canPurchaseProduct("p2", 1);

      // Assert
      expect(canPurchase).toBe(false);
    });

    it("应该允许购买免费产品", () => {
      // Act
      const canPurchase = productService.canPurchaseProduct("free1", 100);

      // Assert
      expect(canPurchase).toBe(true);
    });

    it("应该拒绝购买不存在的产品", () => {
      // Act
      const canPurchase = productService.canPurchaseProduct("nonexistent", 1);

      // Assert
      expect(canPurchase).toBe(false);
    });
  });

  describe("getProductPriceDisplay", () => {
    it("应该显示正常产品价格", () => {
      // Act
      const priceDisplay = productService.getProductPriceDisplay("p1");

      // Assert
      expect(priceDisplay).toBe("¥ 5999.00");
    });

    it("应该显示缺货产品价格", () => {
      // Act
      const priceDisplay = productService.getProductPriceDisplay("p2");

      // Assert
      expect(priceDisplay).toBe("¥ 15999.00 (缺货)");
    });

    it("应该显示免费产品价格", () => {
      // Act
      const priceDisplay = productService.getProductPriceDisplay("free1");

      // Assert
      expect(priceDisplay).toBe("免费");
    });

    it("应该显示不存在产品的价格", () => {
      // Act
      const priceDisplay = productService.getProductPriceDisplay("nonexistent");

      // Assert
      expect(priceDisplay).toBe("价格未知");
    });
  });
});
