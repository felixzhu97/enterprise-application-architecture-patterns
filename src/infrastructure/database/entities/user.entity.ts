/**
 * 用户数据库实体
 * 演示 Data Mapper 模式中的实体定义
 *
 * 与领域模型分离，专注于数据库映射
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from "typeorm";

@Entity("users")
@Index(["email"], { unique: true })
@Index(["username"], { unique: true })
export class UserEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "varchar", length: 50, unique: true })
  username: string;

  @Column({ type: "varchar", length: 100, unique: true })
  email: string;

  @Column({ type: "varchar", length: 255 })
  password_hash: string;

  @Column({ type: "varchar", length: 50 })
  first_name: string;

  @Column({ type: "varchar", length: 50 })
  last_name: string;

  @Column({ type: "varchar", length: 20, nullable: true })
  phone: string | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  avatar: string | null;

  @Column({ type: "date", nullable: true })
  date_of_birth: Date | null;

  @Column({
    type: "enum",
    enum: ["active", "inactive", "suspended", "deleted"],
    default: "active",
  })
  status: string;

  @Column({
    type: "enum",
    enum: ["customer", "admin", "manager"],
    default: "customer",
  })
  role: string;

  @Column({ type: "boolean", default: false })
  email_verified: boolean;

  @Column({ type: "timestamp", nullable: true })
  last_login_at: Date | null;

  @Column({ type: "int", default: 0 })
  failed_login_attempts: number;

  @Column({ type: "timestamp", nullable: true })
  locked_until: Date | null;

  @Column({ type: "int", default: 0 })
  version: number;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
