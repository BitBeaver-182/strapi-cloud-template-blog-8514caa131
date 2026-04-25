import CurrencySeeder from './CurrencySeeder';
import QuoteSeeder from './QuoteSeeder';
import Seeder from './Seeder';
import SupplierSeeder from './SupplierSeeder';
import UserSeeder from './UserSeeder';

export default class DatabaseSeeder extends Seeder {
  async run(): Promise<void> {
    this.log('Starting database seeding...');

    await new CurrencySeeder(this.strapi, this.factories).run();
    await new SupplierSeeder(this.strapi, this.factories).run();
    await new UserSeeder(this.strapi, this.factories).run();
    await new QuoteSeeder(this.strapi, this.factories).run();

    this.log('Database seeding completed!');
  }
}

