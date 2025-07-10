/**
 * 订单数据库实体
 * 演示 Foreign Key Mapping 模式
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from "typeorm";
import { UserEntity } from "./user.entity";
import { OrderItemEntity } from "./order-item.entity";

@Entity("orders")
@Index(["user_id"])
@Index(["status"])
@Index(["created_at"])
export class OrderEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "uuid" })
  user_id: string;

  @Column({
    type: "enum",
    enum: ["pending", "confirmed", "shipped", "delivered", "cancelled"],
    default: "pending",
  })
  status: string;

  @Column({ type: "decimal", precision: 10, scale: 2 })
  total_amount: number;

  @Column({ type: "varchar", length: 3, default: "CNY" })
  currency: string;

  @Column({ type: "decimal", precision: 10, scale: 2, default: 0 })
  shipping_cost: number;

  @Column({ type: "decimal", precision: 10, scale: 2, default: 0 })
  tax_amount: number;

  @Column({ type: "decimal", precision: 10, scale: 2, default: 0 })
  discount_amount: number;

  // 配送地址
  @Column({ type: "varchar", length: 255 })
  shipping_street: string;

  @Column({ type: "varchar", length: 100 })
  shipping_city: string;

  @Column({ type: "varchar", length: 100 })
  shipping_province: string;

  @Column({ type: "varchar", length: 20 })
  shipping_postal_code: string;

  @Column({ type: "varchar", length: 100, default: "中国" })
  shipping_country: string;

  @Column({ type: "varchar", length: 100 })
  shipping_recipient_name: string;

  @Column({ type: "varchar", length: 20 })
  shipping_recipient_phone: string;

  // 支付信息
  @Column({ type: "varchar", length: 50, nullable: true })
  payment_method: string | null;

  @Column({ type: "varchar", length: 100, nullable: true })
  payment_transaction_id: string | null;

  @Column({ type: "timestamp", nullable: true })
  paid_at: Date | null;

  // 配送信息
  @Column({ type: "varchar", length: 100, nullable: true })
  tracking_number: string | null;

  @Column({ type: "timestamp", nullable: true })
  shipped_at: Date | null;

  @Column({ type: "timestamp", nullable: true })
  delivered_at: Date | null;

  @Column({ type: "text", nullable: true })
  notes: string | null;

  @Column({ type: "int", default: 0 })
  version: number;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  // 关联关系
  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: "user_id" })
  user: UserEntity;

  @OneToMany(() => OrderItemEntity, (orderItem) => orderItem.order, {
    cascade: true,
  })
  items: OrderItemEntity[];
}
