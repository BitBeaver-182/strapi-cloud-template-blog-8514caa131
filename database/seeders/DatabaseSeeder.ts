import CurrencySeeder from './CurrencySeeder';
import Seeder from './Seeder';
import UserSeeder from './UserSeeder';

export default class DatabaseSeeder extends Seeder {
  async run(): Promise<void> {
    this.log('Starting database seeding...');

    await new UserSeeder(this.strapi, this.factories).run();
    await new CurrencySeeder(this.strapi, this.factories).run();

    this.log('Database seeding completed!');
  }
}

