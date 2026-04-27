import type { UID } from '@strapi/types';
import Factory from './Factory';

const USERS_PERMISSIONS_USER_UID =
  'plugin::users-permissions.user' satisfies UID.ContentType;

export default class UserFactory extends Factory<typeof USERS_PERMISSIONS_USER_UID> {
  get uid(): typeof USERS_PERMISSIONS_USER_UID {
    return USERS_PERMISSIONS_USER_UID;
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
