import { faker } from '@faker-js/faker';
import bcrypt from 'bcryptjs';
import { User, UserRole } from '../../types/user';

export interface UserFactoryOptions {
  role?: UserRole;
  emailVerified?: boolean;
  isActive?: boolean;
  hasProfile?: boolean;
  withAvatar?: boolean;
  passwordPlaintext?: string;
  organizationId?: string;
  stripeCustomerId?: string;
}

export class UserFactory {
  static async create(options: UserFactoryOptions = {}): Promise<User> {
    const {
      role = UserRole.USER,
      emailVerified = true,
      isActive = true,
      hasProfile = true,
      withAvatar = false,
      passwordPlaintext = 'Test123!',
      organizationId,
      stripeCustomerId
    } = options;

    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    const email = faker.internet.email({ firstName, lastName }).toLowerCase();
    const hashedPassword = await bcrypt.hash(passwordPlaintext, 12);

    const baseUser: User = {
      id: faker.string.uuid(),
      email,
      password: hashedPassword,
      role,
      emailVerified,
      isActive,
      createdAt: faker.date.past({ years: 2 }),
      updatedAt: new Date(),
      profile: null,
      organizationId: organizationId || null,
      stripeCustomerId: stripeCustomerId || null
    };

    if (hasProfile) {
      baseUser.profile = {
        firstName,
        lastName,
        bio: faker.lorem.paragraph(),
        website: faker.internet.url(),
        location: faker.location.city(),
        avatar: withAvatar ? faker.image.avatar() : null,
        socialLinks: {
          twitter: faker.internet.userName(),
          linkedin: faker.internet.userName(),
          github: faker.internet.userName()
        },
        preferences: {
          emailNotifications: faker.datatype.boolean(),
          marketingEmails: faker.datatype.boolean(),
          publicProfile: faker.datatype.boolean()
        }
      };
    }

    return baseUser;
  }

  static async createMany(count: number, options: UserFactoryOptions = {}): Promise<User[]> {
    const users: User[] = [];
    for (let i = 0; i < count; i++) {
      users.push(await this.create(options));
    }
    return users;
  }

  // Specialized factory methods for common scenarios
  static async createAdmin(options: UserFactoryOptions = {}): Promise<User> {
    return this.create({
      ...options,
      role: UserRole.ADMIN,
      emailVerified: true,
      isActive: true,
      hasProfile: true
    });
  }

  static async createCreator(options: UserFactoryOptions = {}): Promise<User> {
    return this.create({
      ...options,
      role: UserRole.CREATOR,
      emailVerified: true,
      isActive: true,
      hasProfile: true,
      withAvatar: true
    });
  }

  static async createPendingUser(options: UserFactoryOptions = {}): Promise<User> {
    return this.create({
      ...options,
      emailVerified: false,
      isActive: true,
      hasProfile: false
    });
  }

  static async createInactiveUser(options: UserFactoryOptions = {}): Promise<User> {
    return this.create({
      ...options,
      isActive: false,
      emailVerified: true
    });
  }

  static async createUserWithStripe(options: UserFactoryOptions = {}): Promise<User> {
    return this.create({
      ...options,
      stripeCustomerId: `cus_${faker.string.alphanumeric(14)}`
    });
  }

  // Edge cases for testing
  static async createUserWithLongName(options: UserFactoryOptions = {}): Promise<User> {
    const user = await this.create(options);
    if (user.profile) {
      user.profile.firstName = faker.lorem.words(10); // Very long first name
      user.profile.lastName = faker.lorem.words(10); // Very long last name
    }
    return user;
  }

  static async createUserWithSpecialCharsEmail(options: UserFactoryOptions = {}): Promise<User> {
    const user = await this.create(options);
    user.email = `test+special.chars-${faker.string.alphanumeric(5)}@example.com`;
    return user;
  }

  static async createMinimalUser(options: UserFactoryOptions = {}): Promise<User> {
    return this.create({
      ...options,
      hasProfile: false,
      withAvatar: false
    });
  }

  // Batch creation helpers
  static async createUserCohort(adminCount = 1, creatorCount = 3, userCount = 10): Promise<{
    admins: User[];
    creators: User[];
    users: User[];
    all: User[];
  }> {
    const [admins, creators, users] = await Promise.all([
      this.createMany(adminCount, { role: UserRole.ADMIN }),
      this.createMany(creatorCount, { role: UserRole.CREATOR }),
      this.createMany(userCount, { role: UserRole.USER })
    ]);

    return {
      admins,
      creators,
      users,
      all: [...admins, ...creators, ...users]
    };
  }

  // Create test scenarios
  static async createTestScenario(scenario: 'basic' | 'complex' | 'edge-cases'): Promise<User[]> {
    switch (scenario) {
      case 'basic':
        return this.createMany(5);
      
      case 'complex':
        const [admin, creators, users, pending] = await Promise.all([
          this.createAdmin(),
          this.createMany(3, { role: UserRole.CREATOR }),
          this.createMany(10, { role: UserRole.USER }),
          this.createMany(2, { emailVerified: false })
        ]);
        return [admin, ...creators, ...users, ...pending];
      
      case 'edge-cases':
        return Promise.all([
          this.createUserWithLongName(),
          this.createUserWithSpecialCharsEmail(),
          this.createInactiveUser(),
          this.createMinimalUser()
        ]);
      
      default:
        return this.createMany(3);
    }
  }
}

// Export utility functions
export const createUser = UserFactory.create.bind(UserFactory);
export const createUsers = UserFactory.createMany.bind(UserFactory);
export const createAdmin = UserFactory.createAdmin.bind(UserFactory);
export const createCreator = UserFactory.createCreator.bind(UserFactory);