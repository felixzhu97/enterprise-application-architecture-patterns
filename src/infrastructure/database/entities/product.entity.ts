/**
 * 产品数据库实体
 * 演示 Data Mapper 模式中的实体定义
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { CategoryEntity } from "./category.entity";

@Entity("products")
@Index(["sku"], { unique: true })
@Index(["category_id"])
export class ProductEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "varchar", length: 100 })
  name: string;

  @Column({ type: "text" })
  description: string;

  @Column({ type: "decimal", precision: 10, scale: 2 })
  price_amount: number;

  @Column({ type: "varchar", length: 3, default: "CNY" })
  price_currency: string;

  @Column({ type: "uuid" })
  category_id: string;

  @Column({ type: "int", default: 0 })
  stock_quantity: number;

  @Column({ type: "int", default: 0 })
  reserved_quantity: number;

  @Column({ type: "varchar", length: 50, unique: true })
  sku: string;

  @Column({ type: "decimal", precision: 8, scale: 3, nullable: true })
  weight: number | null;

  @Column({ type: "decimal", precision: 8, scale: 2, nullable: true })
  length: number | null;

  @Column({ type: "decimal", precision: 8, scale: 2, nullable: true })
  width: number | null;

  @Column({ type: "decimal", precision: 8, scale: 2, nullable: true })
  height: number | null;

  @Column({ type: "varchar", length: 10, nullable: true, default: "cm" })
  dimension_unit: string | null;

  @Column({ type: "text", nullable: true })
  tags: string | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  image_url: string | null;

  @Column({ type: "boolean", default: true })
  is_active: boolean;

  @Column({ type: "int", default: 0 })
  version: number;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  // 关联关系
  @ManyToOne(() => CategoryEntity)
  @JoinColumn({ name: "category_id" })
  category: CategoryEntity;
}
