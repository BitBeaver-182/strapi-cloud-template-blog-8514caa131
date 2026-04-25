import Seeder from './Seeder';

export default class CurrencySeeder extends Seeder {
  async run(): Promise<void> {
    this.log('Seeding currencies...');

    const currencies = [
      { code: 'CNY', symbol: '¥', decimals: 2 },
      { code: 'EUR', symbol: '€', decimals: 2 },
      { code: 'HUF', symbol: 'Ft', decimals: 0 },
      { code: 'USD', symbol: '$', decimals: 2 },
    ] as const;

    for (const currency of currencies) {
      const existing = await this.strapi.entityService.findMany('api::currency.currency', {
        filters: { code: currency.code },
        limit: 1,
      });

      const first = Array.isArray(existing) ? existing[0] : null;

      if (first) {
        await this.strapi.entityService.update('api::currency.currency', first.id, {
          data: {
            symbol: currency.symbol,
            decimals: currency.decimals,
          },
        });
        continue;
      }

      await this.strapi.entityService.create('api::currency.currency', {
        data: {
          code: currency.code,
          symbol: currency.symbol,
          decimals: currency.decimals,
        },
      });
    }

    this.log(`Ensured ${currencies.length} currencies`);
  }
}

