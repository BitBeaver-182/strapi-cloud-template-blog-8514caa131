import Seeder from './Seeder';

export default class CurrencySeeder extends Seeder {
  async run(): Promise<void> {
    this.log('Seeding currencies...');

    const currencies = await this.factory('CurrencyFactory').createMany(10);
    this.log(`Created ${currencies.length} currencies`);
  }
}

