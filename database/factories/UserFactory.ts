import Factory from './Factory';

export default class UserFactory extends Factory<'plugin::users-permissions.user'> {
  get model() {
    return 'plugin::users-permissions.user' as const;
  }

  definition() {
    return {
      username: this.faker.internet.username(),
      email: this.faker.internet.email(),
      password: 'Password123!',
      confirmed: true,
      blocked: false,
    };
  }

  /**
   * State: Admin user
   */
  admin() {
    return {
      username: 'admin',
      email: 'admin@example.com',
    };
  }

  /**
   * State: Blocked user
   */
  blocked() {
    return {
      blocked: true,
      confirmed: false,
    };
  }

  /**
   * State: Unconfirmed user
   */
  unconfirmed() {
    return {
      confirmed: false,
    };
  }
}

