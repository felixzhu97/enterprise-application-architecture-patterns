/**
 * 继承映射模式 (Inheritance Mapping Patterns)
 *
 * 处理对象继承层次结构与关系数据库表之间的映射策略
 * 包含三种主要模式：
 * 1. Single Table Inheritance - 单表继承
 * 2. Class Table Inheritance - 类表继承
 * 3. Concrete Table Inheritance - 具体表继承
 */

import { DatabaseConnection } from "../../infrastructure/database/data-source";

// ============================================================================
// 基础类型定义
// ============================================================================

/**
 * 继承映射策略接口
 */
interface InheritanceMappingStrategy<T> {
  save(entity: T): Promise<void>;
  findById(id: string): Promise<T | null>;
  findByType(type: string): Promise<T[]>;
  delete(id: string): Promise<void>;
}

/**
 * 基础实体类
 */
abstract class BaseEntity {
  constructor(
    public id: string,
    public createdAt: Date = new Date(),
    public updatedAt: Date = new Date()
  ) {}

  abstract getType(): string;
}

// ============================================================================
// 示例域模型 - 员工层次结构
// ============================================================================

/**
 * 员工基类
 */
abstract class Employee extends BaseEntity {
  constructor(
    id: string,
    public name: string,
    public email: string,
    public salary: number,
    createdAt?: Date,
    updatedAt?: Date
  ) {
    super(id, createdAt, updatedAt);
  }

  abstract getType(): string;
  abstract calculatePay(): number;
}

/**
 * 全职员工
 */
class FullTimeEmployee extends Employee {
  constructor(
    id: string,
    name: string,
    email: string,
    salary: number,
    public benefits: string[],
    public department: string,
    createdAt?: Date,
    updatedAt?: Date
  ) {
    super(id, name, email, salary, createdAt, updatedAt);
  }

  getType(): string {
    return "FullTime";
  }

  calculatePay(): number {
    return this.salary;
  }
}

/**
 * 兼职员工
 */
class PartTimeEmployee extends Employee {
  constructor(
    id: string,
    name: string,
    email: string,
    salary: number,
    public hoursPerWeek: number,
    public hourlyRate: number,
    createdAt?: Date,
    updatedAt?: Date
  ) {
    super(id, name, email, salary, createdAt, updatedAt);
  }

  getType(): string {
    return "PartTime";
  }

  calculatePay(): number {
    return this.hoursPerWeek * this.hourlyRate * 4; // 月薪
  }
}

/**
 * 合同工
 */
class ContractEmployee extends Employee {
  constructor(
    id: string,
    name: string,
    email: string,
    salary: number,
    public contractEndDate: Date,
    public projectName: string,
    createdAt?: Date,
    updatedAt?: Date
  ) {
    super(id, name, email, salary, createdAt, updatedAt);
  }

  getType(): string {
    return "Contract";
  }

  calculatePay(): number {
    return this.salary;
  }
}

// ============================================================================
// 1. Single Table Inheritance - 单表继承
// ============================================================================

/**
 * 单表继承映射器
 *
 * 所有继承层次的类都映射到同一个表中，使用类型字段区分不同的子类
 *
 * 优点：
 * - 查询简单，不需要连接
 * - 添加新子类容易
 * - 多态查询高效
 *
 * 缺点：
 * - 表可能有很多空字段
 * - 字段约束限制
 * - 表可能变得很宽
 */
class SingleTableInheritanceMapper
  implements InheritanceMappingStrategy<Employee>
{
  private db: DatabaseConnection;

  constructor(db: DatabaseConnection) {
    this.db = db;
  }

  async save(employee: Employee): Promise<void> {
    const type = employee.getType();

    // 根据类型保存不同的字段
    const baseData = {
      id: employee.id,
      type: type,
      name: employee.name,
      email: employee.email,
      salary: employee.salary,
      created_at: employee.createdAt,
      updated_at: employee.updatedAt,
    };

    let specificData = {};

    switch (type) {
      case "FullTime":
        const ft = employee as FullTimeEmployee;
        specificData = {
          benefits: JSON.stringify(ft.benefits),
          department: ft.department,
          hours_per_week: null,
          hourly_rate: null,
          contract_end_date: null,
          project_name: null,
        };
        break;

      case "PartTime":
        const pt = employee as PartTimeEmployee;
        specificData = {
          benefits: null,
          department: null,
          hours_per_week: pt.hoursPerWeek,
          hourly_rate: pt.hourlyRate,
          contract_end_date: null,
          project_name: null,
        };
        break;

      case "Contract":
        const ct = employee as ContractEmployee;
        specificData = {
          benefits: null,
          department: null,
          hours_per_week: null,
          hourly_rate: null,
          contract_end_date: ct.contractEndDate,
          project_name: ct.projectName,
        };
        break;
    }

    const data = { ...baseData, ...specificData };

    await this.db.query(
      `
      INSERT INTO employees (
        id, type, name, email, salary, benefits, department,
        hours_per_week, hourly_rate, contract_end_date, project_name,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        name = VALUES(name),
        email = VALUES(email),
        salary = VALUES(salary),
        benefits = VALUES(benefits),
        department = VALUES(department),
        hours_per_week = VALUES(hours_per_week),
        hourly_rate = VALUES(hourly_rate),
        contract_end_date = VALUES(contract_end_date),
        project_name = VALUES(project_name),
        updated_at = VALUES(updated_at)
    `,
      [
        data.id,
        data.type,
        data.name,
        data.email,
        data.salary,
        data.benefits,
        data.department,
        data.hours_per_week,
        data.hourly_rate,
        data.contract_end_date,
        data.project_name,
        data.created_at,
        data.updated_at,
      ]
    );
  }

  async findById(id: string): Promise<Employee | null> {
    const result = await this.db.query("SELECT * FROM employees WHERE id = ?", [
      id,
    ]);

    if (!result || result.length === 0) {
      return null;
    }

    return this.mapRowToEmployee(result[0]);
  }

  async findByType(type: string): Promise<Employee[]> {
    const result = await this.db.query(
      "SELECT * FROM employees WHERE type = ?",
      [type]
    );

    return result.map((row: any) => this.mapRowToEmployee(row));
  }

  async delete(id: string): Promise<void> {
    await this.db.query("DELETE FROM employees WHERE id = ?", [id]);
  }

  private mapRowToEmployee(row: any): Employee {
    const baseArgs = [
      row.id,
      row.name,
      row.email,
      row.salary,
      row.created_at,
      row.updated_at,
    ];

    switch (row.type) {
      case "FullTime":
        return new FullTimeEmployee(
          ...baseArgs,
          JSON.parse(row.benefits || "[]"),
          row.department
        );

      case "PartTime":
        return new PartTimeEmployee(
          ...baseArgs,
          row.hours_per_week,
          row.hourly_rate
        );

      case "Contract":
        return new ContractEmployee(
          ...baseArgs,
          row.contract_end_date,
          row.project_name
        );

      default:
        throw new Error(`Unknown employee type: ${row.type}`);
    }
  }
}

// ============================================================================
// 2. Class Table Inheritance - 类表继承
// ============================================================================

/**
 * 类表继承映射器
 *
 * 每个类（包括抽象类）都有自己的表，子类表通过外键引用父类表
 *
 * 优点：
 * - 数据规范化，没有冗余字段
 * - 关系清晰，符合面向对象设计
 * - 约束容易实现
 *
 * 缺点：
 * - 查询需要连接多个表
 * - 性能可能较差
 * - 修改结构复杂
 */
class ClassTableInheritanceMapper
  implements InheritanceMappingStrategy<Employee>
{
  private db: DatabaseConnection;

  constructor(db: DatabaseConnection) {
    this.db = db;
  }

  async save(employee: Employee): Promise<void> {
    const type = employee.getType();

    // 先保存基类数据
    await this.db.query(
      `
      INSERT INTO employee_base (
        id, name, email, salary, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        name = VALUES(name),
        email = VALUES(email),
        salary = VALUES(salary),
        updated_at = VALUES(updated_at)
    `,
      [
        employee.id,
        employee.name,
        employee.email,
        employee.salary,
        employee.createdAt,
        employee.updatedAt,
      ]
    );

    // 根据类型保存子类数据
    switch (type) {
      case "FullTime":
        const ft = employee as FullTimeEmployee;
        await this.db.query(
          `
          INSERT INTO employee_fulltime (
            id, benefits, department
          ) VALUES (?, ?, ?)
          ON DUPLICATE KEY UPDATE
            benefits = VALUES(benefits),
            department = VALUES(department)
        `,
          [ft.id, JSON.stringify(ft.benefits), ft.department]
        );
        break;

      case "PartTime":
        const pt = employee as PartTimeEmployee;
        await this.db.query(
          `
          INSERT INTO employee_parttime (
            id, hours_per_week, hourly_rate
          ) VALUES (?, ?, ?)
          ON DUPLICATE KEY UPDATE
            hours_per_week = VALUES(hours_per_week),
            hourly_rate = VALUES(hourly_rate)
        `,
          [pt.id, pt.hoursPerWeek, pt.hourlyRate]
        );
        break;

      case "Contract":
        const ct = employee as ContractEmployee;
        await this.db.query(
          `
          INSERT INTO employee_contract (
            id, contract_end_date, project_name
          ) VALUES (?, ?, ?)
          ON DUPLICATE KEY UPDATE
            contract_end_date = VALUES(contract_end_date),
            project_name = VALUES(project_name)
        `,
          [ct.id, ct.contractEndDate, ct.projectName]
        );
        break;
    }
  }

  async findById(id: string): Promise<Employee | null> {
    // 先从基表查询
    const baseResult = await this.db.query(
      "SELECT * FROM employee_base WHERE id = ?",
      [id]
    );

    if (!baseResult || baseResult.length === 0) {
      return null;
    }

    const baseData = baseResult[0];

    // 尝试从各个子表查询
    const [ftResult, ptResult, ctResult] = await Promise.all([
      this.db.query("SELECT * FROM employee_fulltime WHERE id = ?", [id]),
      this.db.query("SELECT * FROM employee_parttime WHERE id = ?", [id]),
      this.db.query("SELECT * FROM employee_contract WHERE id = ?", [id]),
    ]);

    if (ftResult && ftResult.length > 0) {
      const ftData = ftResult[0];
      return new FullTimeEmployee(
        baseData.id,
        baseData.name,
        baseData.email,
        baseData.salary,
        JSON.parse(ftData.benefits || "[]"),
        ftData.department,
        baseData.created_at,
        baseData.updated_at
      );
    }

    if (ptResult && ptResult.length > 0) {
      const ptData = ptResult[0];
      return new PartTimeEmployee(
        baseData.id,
        baseData.name,
        baseData.email,
        baseData.salary,
        ptData.hours_per_week,
        ptData.hourly_rate,
        baseData.created_at,
        baseData.updated_at
      );
    }

    if (ctResult && ctResult.length > 0) {
      const ctData = ctResult[0];
      return new ContractEmployee(
        baseData.id,
        baseData.name,
        baseData.email,
        baseData.salary,
        ctData.contract_end_date,
        ctData.project_name,
        baseData.created_at,
        baseData.updated_at
      );
    }

    return null;
  }

  async findByType(type: string): Promise<Employee[]> {
    let tableName: string;
    let employeeClass: any;

    switch (type) {
      case "FullTime":
        tableName = "employee_fulltime";
        employeeClass = FullTimeEmployee;
        break;
      case "PartTime":
        tableName = "employee_parttime";
        employeeClass = PartTimeEmployee;
        break;
      case "Contract":
        tableName = "employee_contract";
        employeeClass = ContractEmployee;
        break;
      default:
        return [];
    }

    const result = await this.db.query(`
      SELECT b.*, s.* 
      FROM employee_base b
      INNER JOIN ${tableName} s ON b.id = s.id
    `);

    return result.map((row: any) => {
      switch (type) {
        case "FullTime":
          return new FullTimeEmployee(
            row.id,
            row.name,
            row.email,
            row.salary,
            JSON.parse(row.benefits || "[]"),
            row.department,
            row.created_at,
            row.updated_at
          );
        case "PartTime":
          return new PartTimeEmployee(
            row.id,
            row.name,
            row.email,
            row.salary,
            row.hours_per_week,
            row.hourly_rate,
            row.created_at,
            row.updated_at
          );
        case "Contract":
          return new ContractEmployee(
            row.id,
            row.name,
            row.email,
            row.salary,
            row.contract_end_date,
            row.project_name,
            row.created_at,
            row.updated_at
          );
        default:
          throw new Error(`Unknown type: ${type}`);
      }
    });
  }

  async delete(id: string): Promise<void> {
    // 删除子表记录（会被外键约束自动处理）
    await Promise.all([
      this.db.query("DELETE FROM employee_fulltime WHERE id = ?", [id]),
      this.db.query("DELETE FROM employee_parttime WHERE id = ?", [id]),
      this.db.query("DELETE FROM employee_contract WHERE id = ?", [id]),
    ]);

    // 删除基表记录
    await this.db.query("DELETE FROM employee_base WHERE id = ?", [id]);
  }
}

// ============================================================================
// 3. Concrete Table Inheritance - 具体表继承
// ============================================================================

/**
 * 具体表继承映射器
 *
 * 只为具体类创建表，每个表包含该类及其所有超类的字段
 *
 * 优点：
 * - 查询单个类型时性能最好
 * - 没有空字段
 * - 无需连接
 *
 * 缺点：
 * - 字段重复，违反规范化
 * - 多态查询复杂，需要UNION
 * - 修改超类字段需要修改所有表
 */
class ConcreteTableInheritanceMapper
  implements InheritanceMappingStrategy<Employee>
{
  private db: DatabaseConnection;

  constructor(db: DatabaseConnection) {
    this.db = db;
  }

  async save(employee: Employee): Promise<void> {
    const type = employee.getType();

    switch (type) {
      case "FullTime":
        const ft = employee as FullTimeEmployee;
        await this.db.query(
          `
          INSERT INTO fulltime_employees (
            id, name, email, salary, benefits, department, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            name = VALUES(name),
            email = VALUES(email),
            salary = VALUES(salary),
            benefits = VALUES(benefits),
            department = VALUES(department),
            updated_at = VALUES(updated_at)
        `,
          [
            ft.id,
            ft.name,
            ft.email,
            ft.salary,
            JSON.stringify(ft.benefits),
            ft.department,
            ft.createdAt,
            ft.updatedAt,
          ]
        );
        break;

      case "PartTime":
        const pt = employee as PartTimeEmployee;
        await this.db.query(
          `
          INSERT INTO parttime_employees (
            id, name, email, salary, hours_per_week, hourly_rate, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            name = VALUES(name),
            email = VALUES(email),
            salary = VALUES(salary),
            hours_per_week = VALUES(hours_per_week),
            hourly_rate = VALUES(hourly_rate),
            updated_at = VALUES(updated_at)
        `,
          [
            pt.id,
            pt.name,
            pt.email,
            pt.salary,
            pt.hoursPerWeek,
            pt.hourlyRate,
            pt.createdAt,
            pt.updatedAt,
          ]
        );
        break;

      case "Contract":
        const ct = employee as ContractEmployee;
        await this.db.query(
          `
          INSERT INTO contract_employees (
            id, name, email, salary, contract_end_date, project_name, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            name = VALUES(name),
            email = VALUES(email),
            salary = VALUES(salary),
            contract_end_date = VALUES(contract_end_date),
            project_name = VALUES(project_name),
            updated_at = VALUES(updated_at)
        `,
          [
            ct.id,
            ct.name,
            ct.email,
            ct.salary,
            ct.contractEndDate,
            ct.projectName,
            ct.createdAt,
            ct.updatedAt,
          ]
        );
        break;
    }
  }

  async findById(id: string): Promise<Employee | null> {
    // 需要查询所有表
    const [ftResult, ptResult, ctResult] = await Promise.all([
      this.db.query("SELECT * FROM fulltime_employees WHERE id = ?", [id]),
      this.db.query("SELECT * FROM parttime_employees WHERE id = ?", [id]),
      this.db.query("SELECT * FROM contract_employees WHERE id = ?", [id]),
    ]);

    if (ftResult && ftResult.length > 0) {
      const row = ftResult[0];
      return new FullTimeEmployee(
        row.id,
        row.name,
        row.email,
        row.salary,
        JSON.parse(row.benefits || "[]"),
        row.department,
        row.created_at,
        row.updated_at
      );
    }

    if (ptResult && ptResult.length > 0) {
      const row = ptResult[0];
      return new PartTimeEmployee(
        row.id,
        row.name,
        row.email,
        row.salary,
        row.hours_per_week,
        row.hourly_rate,
        row.created_at,
        row.updated_at
      );
    }

    if (ctResult && ctResult.length > 0) {
      const row = ctResult[0];
      return new ContractEmployee(
        row.id,
        row.name,
        row.email,
        row.salary,
        row.contract_end_date,
        row.project_name,
        row.created_at,
        row.updated_at
      );
    }

    return null;
  }

  async findByType(type: string): Promise<Employee[]> {
    let tableName: string;

    switch (type) {
      case "FullTime":
        tableName = "fulltime_employees";
        break;
      case "PartTime":
        tableName = "parttime_employees";
        break;
      case "Contract":
        tableName = "contract_employees";
        break;
      default:
        return [];
    }

    const result = await this.db.query(`SELECT * FROM ${tableName}`);

    return result.map((row: any) => {
      switch (type) {
        case "FullTime":
          return new FullTimeEmployee(
            row.id,
            row.name,
            row.email,
            row.salary,
            JSON.parse(row.benefits || "[]"),
            row.department,
            row.created_at,
            row.updated_at
          );
        case "PartTime":
          return new PartTimeEmployee(
            row.id,
            row.name,
            row.email,
            row.salary,
            row.hours_per_week,
            row.hourly_rate,
            row.created_at,
            row.updated_at
          );
        case "Contract":
          return new ContractEmployee(
            row.id,
            row.name,
            row.email,
            row.salary,
            row.contract_end_date,
            row.project_name,
            row.created_at,
            row.updated_at
          );
        default:
          throw new Error(`Unknown type: ${type}`);
      }
    });
  }

  async delete(id: string): Promise<void> {
    // 需要删除所有表中的记录
    await Promise.all([
      this.db.query("DELETE FROM fulltime_employees WHERE id = ?", [id]),
      this.db.query("DELETE FROM parttime_employees WHERE id = ?", [id]),
      this.db.query("DELETE FROM contract_employees WHERE id = ?", [id]),
    ]);
  }

  /**
   * 多态查询 - 查询所有员工
   */
  async findAllEmployees(): Promise<Employee[]> {
    const result = await this.db.query(`
      SELECT 'FullTime' as type, id, name, email, salary, benefits, department, 
             null as hours_per_week, null as hourly_rate, 
             null as contract_end_date, null as project_name,
             created_at, updated_at
      FROM fulltime_employees
      UNION ALL
      SELECT 'PartTime' as type, id, name, email, salary, 
             null as benefits, null as department,
             hours_per_week, hourly_rate,
             null as contract_end_date, null as project_name,
             created_at, updated_at
      FROM parttime_employees
      UNION ALL
      SELECT 'Contract' as type, id, name, email, salary,
             null as benefits, null as department,
             null as hours_per_week, null as hourly_rate,
             contract_end_date, project_name,
             created_at, updated_at
      FROM contract_employees
      ORDER BY name
    `);

    return result.map((row: any) => {
      switch (row.type) {
        case "FullTime":
          return new FullTimeEmployee(
            row.id,
            row.name,
            row.email,
            row.salary,
            JSON.parse(row.benefits || "[]"),
            row.department,
            row.created_at,
            row.updated_at
          );
        case "PartTime":
          return new PartTimeEmployee(
            row.id,
            row.name,
            row.email,
            row.salary,
            row.hours_per_week,
            row.hourly_rate,
            row.created_at,
            row.updated_at
          );
        case "Contract":
          return new ContractEmployee(
            row.id,
            row.name,
            row.email,
            row.salary,
            row.contract_end_date,
            row.project_name,
            row.created_at,
            row.updated_at
          );
        default:
          throw new Error(`Unknown type: ${row.type}`);
      }
    });
  }
}

// ============================================================================
// 映射器工厂
// ============================================================================

/**
 * 继承映射器工厂
 */
class InheritanceMappingFactory {
  private db: DatabaseConnection;

  constructor(db: DatabaseConnection) {
    this.db = db;
  }

  /**
   * 创建单表继承映射器
   */
  createSingleTableMapper(): SingleTableInheritanceMapper {
    return new SingleTableInheritanceMapper(this.db);
  }

  /**
   * 创建类表继承映射器
   */
  createClassTableMapper(): ClassTableInheritanceMapper {
    return new ClassTableInheritanceMapper(this.db);
  }

  /**
   * 创建具体表继承映射器
   */
  createConcreteTableMapper(): ConcreteTableInheritanceMapper {
    return new ConcreteTableInheritanceMapper(this.db);
  }
}

// ============================================================================
// 使用示例和测试
// ============================================================================

/**
 * 继承映射模式使用示例
 */
export class InheritanceMappingDemo {
  private factory: InheritanceMappingFactory;

  constructor(db: DatabaseConnection) {
    this.factory = new InheritanceMappingFactory(db);
  }

  /**
   * 演示单表继承
   */
  async demonstrateSingleTableInheritance(): Promise<void> {
    console.log("\n=== 单表继承模式演示 ===");

    const mapper = this.factory.createSingleTableMapper();

    // 创建不同类型的员工
    const employees = [
      new FullTimeEmployee(
        "ft1",
        "Alice Smith",
        "alice@company.com",
        75000,
        ["health", "dental", "401k"],
        "Engineering"
      ),
      new PartTimeEmployee("pt1", "Bob Johnson", "bob@company.com", 0, 20, 25),
      new ContractEmployee(
        "ct1",
        "Carol Wilson",
        "carol@company.com",
        80000,
        new Date("2024-12-31"),
        "Project Alpha"
      ),
    ];

    // 保存员工
    for (const employee of employees) {
      await mapper.save(employee);
      console.log(`已保存${employee.getType()}员工: ${employee.name}`);
    }

    // 查询特定类型的员工
    const fullTimeEmployees = await mapper.findByType("FullTime");
    console.log(`查询到${fullTimeEmployees.length}个全职员工`);

    // 查询单个员工
    const alice = await mapper.findById("ft1");
    if (alice) {
      console.log(`查询员工: ${alice.name}, 月薪: ${alice.calculatePay()}`);
    }
  }

  /**
   * 演示类表继承
   */
  async demonstrateClassTableInheritance(): Promise<void> {
    console.log("\n=== 类表继承模式演示 ===");

    const mapper = this.factory.createClassTableMapper();

    const employee = new FullTimeEmployee(
      "ft2",
      "David Brown",
      "david@company.com",
      85000,
      ["health", "dental"],
      "Marketing"
    );

    await mapper.save(employee);
    console.log(`已保存员工到多个表: ${employee.name}`);

    const retrieved = await mapper.findById("ft2");
    if (retrieved) {
      console.log(`从连接查询恢复员工: ${retrieved.name}`);
      console.log(`部门: ${(retrieved as FullTimeEmployee).department}`);
    }
  }

  /**
   * 演示具体表继承
   */
  async demonstrateConcreteTableInheritance(): Promise<void> {
    console.log("\n=== 具体表继承模式演示 ===");

    const mapper = this.factory.createConcreteTableMapper();

    const employees = [
      new FullTimeEmployee(
        "ft3",
        "Eve Davis",
        "eve@company.com",
        90000,
        ["health", "dental", "vision"],
        "Sales"
      ),
      new PartTimeEmployee(
        "pt3",
        "Frank Miller",
        "frank@company.com",
        0,
        15,
        30
      ),
    ];

    for (const employee of employees) {
      await mapper.save(employee);
      console.log(`已保存到具体表: ${employee.name}`);
    }

    // 演示多态查询
    const allEmployees = await mapper.findAllEmployees();
    console.log(`通过UNION查询到所有员工数量: ${allEmployees.length}`);

    allEmployees.forEach((emp) => {
      console.log(`- ${emp.name} (${emp.getType()}): ${emp.calculatePay()}`);
    });
  }

  /**
   * 性能比较演示
   */
  async demonstratePerformanceComparison(): Promise<void> {
    console.log("\n=== 性能比较演示 ===");

    const singleTable = this.factory.createSingleTableMapper();
    const classTable = this.factory.createClassTableMapper();
    const concreteTable = this.factory.createConcreteTableMapper();

    // 测试查询性能
    const testId = "perf-test";
    const employee = new FullTimeEmployee(
      testId,
      "Performance Test",
      "test@company.com",
      50000,
      ["basic"],
      "Testing"
    );

    // 单表继承查询
    const start1 = Date.now();
    await singleTable.save(employee);
    await singleTable.findById(testId);
    const time1 = Date.now() - start1;
    console.log(`单表继承查询时间: ${time1}ms`);

    // 类表继承查询
    const start2 = Date.now();
    await classTable.save(employee);
    await classTable.findById(testId);
    const time2 = Date.now() - start2;
    console.log(`类表继承查询时间: ${time2}ms`);

    // 具体表继承查询
    const start3 = Date.now();
    await concreteTable.save(employee);
    await concreteTable.findById(testId);
    const time3 = Date.now() - start3;
    console.log(`具体表继承查询时间: ${time3}ms`);

    console.log("\n性能分析:");
    console.log("- 单表继承: 查询最快，但可能有很多空字段");
    console.log("- 类表继承: 数据最规范，但需要连接查询");
    console.log("- 具体表继承: 单类型查询快，多态查询需要UNION");
  }
}

// 导出主要类和接口
export {
  InheritanceMappingStrategy,
  BaseEntity,
  Employee,
  FullTimeEmployee,
  PartTimeEmployee,
  ContractEmployee,
  SingleTableInheritanceMapper,
  ClassTableInheritanceMapper,
  ConcreteTableInheritanceMapper,
  InheritanceMappingFactory,
};
