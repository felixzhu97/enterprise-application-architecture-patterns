/**
 * 用户测试数据构建器
 * 
 * 使用 Builder 模式创建复杂的测试用户对象
 * 提供流畅的API来构建测试数据
 */

import { User, UserProfile, UserRole, UserStatus, Address } from "../../domain/model/user";

export class UserTestBuilder {
  private id: string = "test-user-123";
  private username: string = "testuser";
  private email: string = "test@example.com";
  private password: string = "password123";
  private firstName: string = "Test";
  private lastName: string = "User";
  private phone?: string;
  private avatar?: string;
  private dateOfBirth?: Date;
  private role: UserRole = UserRole.CUSTOMER;
  private status: UserStatus = UserStatus.ACTIVE;
  private emailVerified: boolean = false;
  private addresses: Address[] = [];

  static create(): UserTestBuilder {
    return new UserTestBuilder();
  }

  withId(id: string): UserTestBuilder {
    this.id = id;
    return this;
  }

  withUsername(username: string): UserTestBuilder {
    this.username = username;
    return this;
  }

  withEmail(email: string): UserTestBuilder {
    this.email = email;
    return this;
  }

  withPassword(password: string): UserTestBuilder {
    this.password = password;
    return this;
  }

  withName(firstName: string, lastName: string): UserTestBuilder {
    this.firstName = firstName;
    this.lastName = lastName;
    return this;
  }

  withPhone(phone: string): UserTestBuilder {
    this.phone = phone;
    return this;
  }

  withAvatar(avatar: string): UserTestBuilder {
    this.avatar = avatar;
    return this;
  }

  withDateOfBirth(dateOfBirth: Date): UserTestBuilder {
    this.dateOfBirth = dateOfBirth;
    return this;
  }

  withRole(role: UserRole): UserTestBuilder {
    this.role = role;
    return this;
  }

  asAdmin(): UserTestBuilder {
    this.role = UserRole.ADMIN;
    return this;
  }

  asManager(): UserTestBuilder {
    this.role = UserRole.MANAGER;
    return this;
  }

  asCustomer(): UserTestBuilder {
    this.role = UserRole.CUSTOMER;
    return this;
  }

  withStatus(status: UserStatus): UserTestBuilder {
    this.status = status;
    return this;
  }

  asActive(): UserTestBuilder {
    this.status = UserStatus.ACTIVE;
    return this;
  }

  asInactive(): UserTestBuilder {
    this.status = UserStatus.INACTIVE;
    return this;
  }

  asSuspended(): UserTestBuilder {
    this.status = UserStatus.SUSPENDED;
    return this;
  }

  withVerifiedEmail(): UserTestBuilder {
    this.emailVerified = true;
    return this;
  }

  withUnverifiedEmail(): UserTestBuilder {
    this.emailVerified = false;
    return this;
  }

  withAddress(address: Address): UserTestBuilder {
    this.addresses.push(address);
    return this;
  }

  withDefaultAddress(): UserTestBuilder {
    const defaultAddress = new Address(
      "123 Test Street",
      "Test City",
      "Test Province",
      "100000"
    );
    this.addresses.push(defaultAddress);
    return this;
  }

  build(): User {
    const profile = new UserProfile(
      this.firstName,
      this.lastName,
      this.phone,
      this.avatar,
      this.dateOfBirth
    );

    const user = new User(
      this.username,
      this.email,
      this.password,
      profile,
      this.role,
      this.id
    );

    // Apply status modifications
    if (this.status === UserStatus.INACTIVE) {
      user.deactivate();
    } else if (this.status === UserStatus.SUSPENDED) {
      user.suspend();
    }

    // Apply email verification
    if (this.emailVerified) {
      user.verifyEmail();
    }

    // Add addresses
    this.addresses.forEach(address => user.addAddress(address));

    return user;
  }

  buildMany(count: number): User[] {
    const users: User[] = [];
    for (let i = 1; i <= count; i++) {
      const builder = UserTestBuilder.create()
        .withId(`${this.id}-${i}`)
        .withUsername(`${this.username}${i}`)
        .withEmail(`${this.username}${i}@example.com`)
        .withName(`${this.firstName}${i}`, `${this.lastName}${i}`)
        .withRole(this.role)
        .withStatus(this.status);

      if (this.emailVerified) {
        builder.withVerifiedEmail();
      }

      users.push(builder.build());
    }
    return users;
  }
}

/**
 * 地址测试构建器
 */
export class AddressTestBuilder {
  private street: string = "123 Test Street";
  private city: string = "Test City";
  private province: string = "Test Province";
  private postalCode: string = "100000";
  private country: string = "中国";

  static create(): AddressTestBuilder {
    return new AddressTestBuilder();
  }

  withStreet(street: string): AddressTestBuilder {
    this.street = street;
    return this;
  }

  withCity(city: string): AddressTestBuilder {
    this.city = city;
    return this;
  }

  withProvince(province: string): AddressTestBuilder {
    this.province = province;
    return this;
  }

  withPostalCode(postalCode: string): AddressTestBuilder {
    this.postalCode = postalCode;
    return this;
  }

  withCountry(country: string): AddressTestBuilder {
    this.country = country;
    return this;
  }

  build(): Address {
    return new Address(
      this.street,
      this.city,
      this.province,
      this.postalCode,
      this.country
    );
  }
}