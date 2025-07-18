/**
 * 用户测试数据助手
 * 
 * 提供测试中使用的用户相关数据和工厂方法
 */

import { User } from "../../domain/model/user";
import { User as UserEntity } from "../../infrastructure/database/entities/user.entity";

expa {
  /**
   数据
   */
  static createValidRegistrationData(ov = {}) {
    return {
      email: "test@example.com",
      username: "testuser",
      password: "password123",
est",
      lastName: "User",
      ...overrides,
    };
  }

  /**
   * 创建有效的用户登录数据
   */
  s> = {}) {
n {
      email: "test@example.com",
      password: "password123",
      ...overrides,
    };
  }

  /**
   * 创建用户领域模型实例
   /
{
    const defaults = {
      id: "user-123",
      email: "te",
   r",

      firstName: ,
      lastName: "User",
    };

    const userData = };
    const user = new User(
      userData.id,
      
   ,
 dHash,
tName,
   lastName
    );

    // 应用其他属性
    if (overrides.phone !== undefined) e;
    if (overrides.role !== undefined) user.roole;
    if (overrides.isActive !== undefined
      if (overrides.isActive) {
        user.activate();
      } else {
        user.deactivate();
      }
    }
    if (overrides.isEmailVerified !== u
ied) {
        user.verifyEmail();
      }
    }
   t;
At;
    if (overrides.updatedAt !== undefined) user.updateddAt;

    return user;
  }

  /**
   * 创建用户实体实例
   */
  s
= {
      id: "user-123",
      email: "test@example.com"
      username: ",
   ",
est",
      lastName: "User",
      phone: null,
      isActive: 
   d: false,
ser",
      lastLoginAt: null,
      createdAt: new Date("2023-01-01
      updatedAt:"),
   

    return { ...defaults, ...overrides } as UserEntity;
  }

  /**
型
   */
  static createMultipleUsersDomain(count: n] {
    const users:;
   i++) {
.push(
        this.createUserin({
          id
          email: `
          username: `use
          firstName: `User${i}
          lastName: `Test${i}`,
        })
      );
    }
    return users;
  }

  /**
   
 /

   = [];
    for (let i = 1; i <= count; i++) {
   (
        this.createUserEntity({
     `,
          email: `user${i}@example.com`,
     
          firstName: `User${i}`,
          lastN}`,
        })
      );
    }
    return users;
  }

  /**
   * 创建管理员用户
   */
  static createAdminUser(overrides: Partial<any> = {}): User {
    return this.createUserDomain({
      id: "admin-123",
    
      username: "admin",
    ,
",
     ",
      isActive: true,
     ,
      ...overrides,
    });
  }

  /**
   * 创建已验证邮箱的用户
   */
  static createVerifiedUser(o {
    return this.createmain({
      isEmailVerified: true,
    rrides,
    });
  }

  /**
   * 创建已禁用的用户
   */
  static createInactiveUser(overrides: Partial<any> = {}): User {
    erDomain({
      isActive: false,
    ,
  });
  }

  /**
   * 创建用户更新数据
   */
  static createUserUpdateData(overrid {
    return {
      firstName: "Updated",
      lastName: "Name",
      phone: "+1234567890"
      ...overrides,
    };
  }

  s;
  }
}eturn user
    r
    } });   ,
  {i}`ame: `User$  lastNi}`,
       `Bulk${rstName:   fi3",
     assword12: "prdpasswo,
        lkuser${i}`name: `bu      user
  `,example.comuser${i}@email: `bulk        s.push({
 user {
     count; i++)1; i <=  =  for (let i [];
   st users =on cmber) {
   nua(count: ulkUserDateBreat
  static c试）
   */量用户数据（用于性能测  * 创建批*
 
  /*}
];
  ",
     = 'Test'mest_na'Test' OR lae = first_namRE M users WHEE FROET"DEL     test%'",
  '%me LIKEERE usernaROM users WH F    "DELETE,
  "le.com'%exampl LIKE ' emai%' OR '%testail LIKERE emers WHEFROM us"DELETE 
      n [
    returg[] {ies(): strinleanupQuertatic getC
  s句
   */试数据的SQL语 * 清理测
    }

  /**
    };
verrides,
      ...o15,sMonth: UsersThi    new70,
  s: iedUserrif,
      veUsers: 85veti0,
      acrs: 10totalUse       {

    return{}) {any> = rtial<rrides: Patats(oveateUserSic creatst */
  据
  创建用户统计数/**
   * }

      };
  verrides,
   ...o  
 w Date(),loginAt: ne   r",
   se"ule:       ro",
 "testuser  username:  ,
  xample.com"l: "test@eai      em,
er-123""usId:    user   urn {

    ret}) {y> = {: Partial<anoverridesonData( createSessi  static  */
建会话数据
 
   * 创}

  /**    };
  
des,.overri..后过期
       7天 //* 60),7 * 24 * 60  + (w() / 1000).noor(DateMath.flo      exp: 0),
w() / 100oor(Date.no: Math.fl    iat
  ","user      role: er",
 "testusme:  usernam",
    xample.cost@ete "email:",
      "user-123rId:       usen {
{
    retur<any> = {}) alrti Parrides:d(oveJWTPayloateatic crea */
  st载
  JWT令牌负 创建
   *

  /**  }  ];
 },
  3"rd12sswoord: "papasswid-email", ail: "inval    { em格式
  效邮箱
      // 无    " },
  rd: "wo", passmail: "     { e
    // 空字符串    
     
d123" },orassword: "p     { passw" },
 @example.com"test{ email:      ,
    {}
   / 缺少字段 [
      /
    returnginData() {LoalideateInvtic cr  */
  sta据
   * 创建无效的登录数  /**
 ];
  }

  },
    
    ,": "UserastName  l
      st", "TeName:       first3",
 "password12: wordss
        pa(100),"a".repeatername: 
        usample.com",st@exil: "te     ema {
   
     段   // 过长的字
      
   
      },"",tName:    las   : "",
  irstName
        f: "",sword pas       me: "",
  userna     : "",
 ailem      
       {空字符串
 / 
      /          },
  User",
me: "stNa     last",
   e: "TeirstNam    f
    23",word: "1      pass
  er", "testusme:rna use   ",
    e.comt@examplil: "tes
        ema码
      {   // 弱密   
       },
   
  e: "User",tNam
        las"Test",e: tNam      firsd123",
  : "passworrd  passwo  ,
    estuser""tusername:         -email",
id: "invalmail e       {
  格式
    / 无效的邮箱
      /      user" },
: "test", usernamecomple.t@examtes { email: "},
     om" xample.c"test@e   { email:     {},
      缺少必填字段
      //return [

     {tionData()idRegistraateInvalc cre */
  stati证测试）
  据（用于验注册数创建无效的*
   * 
  /*
  };
  }  overrides,
    ...
  ",assword123newpsword: "ewPas",
      nrd123oldpassword: "swo  currentPas    {
urn  {
    ret= {})rtial<any> : Pata(overridesDangeswordChacreatePas
  static   */ 创建密码更改数据
 *
   */*