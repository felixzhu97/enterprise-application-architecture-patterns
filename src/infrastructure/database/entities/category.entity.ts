/**
 * 商品分类数据库实体
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToMany,
} from "typeorm";
import { ProductEntity } from "./product.entity";

@Entity("categories")
@Index(["parent_id"])
export class CategoryEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "varchar", length: 100 })
  name: string;

  @Column({ type: "text", nullable: true })
  description: string | null;

  @Column({ type: "uuid", nullable: true })
  parent_id: string | null;

  @Column({ type: "varchar", length: 50, unique: true })
  slug: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  image_url: string | null;

  @Column({ type: "int", default: 0 })
  sort_order: number;

  @Column({ type: "boolean", default: true })
  is_active: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  // 关联关系
  @OneToMany(() => ProductEntity, (product) => product.category)
  products: ProductEntity[];
}
