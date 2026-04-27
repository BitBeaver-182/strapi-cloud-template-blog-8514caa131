import type { Data, UID } from '@strapi/types';
import Seeder from './Seeder';

const USERS_PERMISSIONS_USER_UID =
  'plugin::users-permissions.user' satisfies UID.ContentType;
type UsersPermissionsUser = Data.ContentType<typeof USERS_PERMISSIONS_USER_UID>;

export default class UserSeeder extends Seeder {
  async run(): Promise<void> {
    this.log('Seeding users...');

    const existingAny = await this.strapi.documents(USERS_PERMISSIONS_USER_UID).findMany({
      fields: ['documentId'],
      limit: 1,
    });

    if (existingAny.length > 0) {
      this.log('Users already exist. Skipping user seeding.');
      return;
    }

    const adminEmail = 'admin@example.com';
    const existingAdmin = await this.strapi.documents(USERS_PERMISSIONS_USER_UID).findFirst({
      filters: { email: adminEmail },
      fields: ['documentId', 'email'],
    });

    if (existingAdmin) {
      this.log(`Admin user already exists: ${existingAdmin.email}`);
    } else {
      const admin = (await this.factory('UserFactory').state('admin').create()) as UsersPermissionsUser;
      this.log(`Created admin user: ${admin.email}`);
    }

    const users = (await this.factory('UserFactory').createMany(10)) as UsersPermissionsUser[];
    this.log(`Created ${users.length} regular users`);

    const blockedUsers = (await this.factory('UserFactory')
      .state('blocked')
      .createMany(5)) as UsersPermissionsUser[];
    this.log(`Created ${blockedUsers.length} blocked users`);

    const customUser = (await this.factory('UserFactory').create({
      username: 'johndoe',
      email: 'john@example.com',
    })) as UsersPermissionsUser;
    this.log(`Created custom user: ${customUser.email}`);
  }
}
