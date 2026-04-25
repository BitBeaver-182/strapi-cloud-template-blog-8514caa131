const Factory = require('./Factory');

class UserFactory extends Factory {
  get model() {
    return 'plugin::users-permissions.user';
  }

  definition() {
    return {
      username: this.faker.internet.userName(),
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

module.exports = UserFactory;
