const Seeder = require('./Seeder');

class UserSeeder extends Seeder {
  async run() {
    this.log('Seeding users...');

    // Create an admin user
    const admin = await this.factory('UserFactory')
      .state('admin')
      .create();
    this.log(`Created admin user: ${admin.email}`);

    // Create 10 regular users
    const users = await this.factory('UserFactory')
      .createMany(10);
    this.log(`Created ${users.length} regular users`);

    // Create 5 blocked users
    const blockedUsers = await this.factory('UserFactory')
      .state('blocked')
      .createMany(5);
    this.log(`Created ${blockedUsers.length} blocked users`);

    // Create a specific user with custom attributes
    const customUser = await this.factory('UserFactory').create({
      username: 'johndoe',
      email: 'john@example.com',
    });
    this.log(`Created custom user: ${customUser.email}`);
  }
}

module.exports = UserSeeder;
