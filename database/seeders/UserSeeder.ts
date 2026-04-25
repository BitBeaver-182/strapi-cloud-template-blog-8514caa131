import Seeder from './Seeder';

export default class UserSeeder extends Seeder {
  async run(): Promise<void> {
    this.log('Seeding users...');

    const existingAny = await this.strapi.entityService.findMany('plugin::users-permissions.user', {
      fields: ['id'],
      limit: 1,
    });

    if (Array.isArray(existingAny) && existingAny.length > 0) {
      this.log('Users already exist. Skipping user seeding.');
      return;
    }

    const adminEmail = 'admin@example.com';
    const existingAdmin = await this.strapi.entityService.findMany('plugin::users-permissions.user', {
      filters: { email: adminEmail },
      fields: ['id', 'email'],
      limit: 1,
    });

    if (Array.isArray(existingAdmin) && existingAdmin[0]) {
      this.log(`Admin user already exists: ${existingAdmin[0].email}`);
    } else {
      const admin = await this.factory('UserFactory').state('admin').create();
      this.log(`Created admin user: ${admin.email}`);
    }

    const users = await this.factory('UserFactory').createMany(10);
    this.log(`Created ${users.length} regular users`);

    const blockedUsers = await this.factory('UserFactory').state('blocked').createMany(5);
    this.log(`Created ${blockedUsers.length} blocked users`);

    const customUser = await this.factory('UserFactory').create({
      username: 'johndoe',
      email: 'john@example.com',
    });
    this.log(`Created custom user: ${customUser.email}`);
  }
}

