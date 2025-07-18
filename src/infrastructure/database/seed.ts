/**
 * 数据库种子数据脚本
 * 
 * 用于初始化数据库的基础数据
 */

import { AppDataSource } from "./data-source";
import { User } from "../entities/user.entity";
import { Category } from "../entities/category.entity";
import { Product } from "../entities/product.entity";
import bcrypt from "bcryptjs";

async function seedDatabase() {
    try {
        if (!AppDataSource.isInitialized) {
            await AppDataSource.initialize();
        }

        console.log("🌱 开始数据库种子数据初始化...");

        // 创建管理员用户
        const userRepository = AppDataSource.getRepository(User);
        const existingAdmin = await userRepository.findOne({
            where: { email: "admin@example.com" }
        });

        if (!existingAdmin) {
            const hashedPassword = await bcrypt.hash("admin123", 12);
            const adminUser = userRepository.create({
                email: "admin@example.com",
                username: "admin",
                passwordHash: hashedPassword,
                firstName: "系统",
                lastName: "管理员",
                isActive: true,
                isEmailVerified: true,
                role: "admin",
                createdAt: new Date(),
                updatedAt: new Date(),
            });
            await userRepository.save(adminUser);
            console.log("✅ 管理员用户创建成功");
        }

        // 创建测试用户
        const existingTestUser = await userRepository.findOne({
            where: { email: "test@example.com" }
        });

        if (!existingTestUser) {
            const hashedPassword = await bcrypt.hash("test123", 12);
            const testUser = userRepository.create({
                email: "test@example.com",
                username: "testuser",
                passwordHash: hashedPassword,
                firstName: "测试",
                lastName: "用户",
                isActive: true,
                isEmailVerified: true,
                role: "user",
                createdAt: new Date(),
                updatedAt: new Date(),
            });
            await userRepository.save(testUser);
            console.log("✅ 测试用户创建成功");
        }

        // 创建商品分类
        const categoryRepository = AppDataSource.getRepository(Category);
        const categories = [
            { name: "电子产品", description: "各类电子设备和配件" },
            { name: "服装", description: "男女服装和配饰" },
            { name: "家居用品", description: "家庭生活用品" },
            { name: "图书", description: "各类书籍和教材" },
            { name: "运动户外", description: "运动器材和户外用品" },
        ];

        for (const categoryData of categories) {
            const existingCategory = await categoryRepository.findOne({
                where: { name: categoryData.name }
            });

            if (!existingCategory) {
                const category = categoryRepository.create({
                    ...categoryData,
                    isActive: true,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                });
                await categoryRepository.save(category);
                console.log(`✅ 分类 "${categoryData.name}" 创建成功`);
            }
        }

        // 创建示例商品
        const productRepository = AppDataSource.getRepository(Product);
        const electronicsCategory = await categoryRepository.findOne({
            where: { name: "电子产品" }
        });

        if (electronicsCategory) {
            const products = [
                {
                    name: "iPhone 15 Pro",
                    description: "苹果最新旗舰手机",
                    price: 7999.00,
                    stock: 50,
                    sku: "IPHONE15PRO001",
                },
                {
                    name: "MacBook Pro 14寸",
                    description: "专业级笔记本电脑",
                    price: 15999.00,
                    stock: 20,
                    sku: "MACBOOKPRO14001",
                },
                {
                    name: "AirPods Pro",
                    description: "主动降噪无线耳机",
                    price: 1899.00,
                    stock: 100,
                    sku: "AIRPODSPRO001",
                },
            ];

            for (const productData of products) {
                const existingProduct = await productRepository.findOne({
                    where: { sku: productData.sku }
                });

                if (!existingProduct) {
                    const product = productRepository.create({
                        ...productData,
                        category: electronicsCategory,
                        isActive: true,
                        createdAt: new Date(),
                        updatedAt: new Date(),
                    });
                    await productRepository.save(product);
                    console.log(`✅ 商品 "${productData.name}" 创建成功`);
                }
            }
        }

        console.log("🎉 数据库种子数据初始化完成！");
    } catch (error) {
        console.error("❌ 数据库种子数据初始化失败:", error);
        process.exit(1);
    } finally {
        if (AppDataSource.isInitialized) {
            await AppDataSource.destroy();
        }
    }
}

if (require.main === module) {
    seedDatabase();
}

export { seedDatabase };