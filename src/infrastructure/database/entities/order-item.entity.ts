/**
 * 订单项数据库实体
 * 演示 Association Table Mapping 模式
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { OrderEntity } from "./order.entity";
import { ProductEntity } from "./product.entity";

@Entity("order_items")
@Index(["order_id"])
@Index(["product_id"])
export class OrderItemEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "uuid" })
  order_id: string;

  @Column({ type: "uuid" })
  product_id: string;

  @Column({ type: "varchar", length: 100 })
  product_name: string;

  @Column({ type: "varchar", length: 50 })
  product_sku: string;

  @Column({ type: "decimal", precision: 10, scale: 2 })
  unit_price: number;

  @Column({ type: "int" })
  quantity: number;

  @Column({ type: "decimal", precision: 10, scale: 2 })
  total_price: number;

  @Column({ type: "varchar", length: 255, nullable: true })
  product_image_url: string | null;

  @Column({ type: "text", nullable: true })
  product_description: string | null;

  // 关联关系
  @ManyToOne(() => OrderEntity, (order) => order.items)
  @JoinColumn({ name: "order_id" })
  order: OrderEntity;

  @ManyToOne(() => ProductEntity)
  @JoinColumn({ name: "product_id" })
  product: ProductEntity;
}
