import { CURRENCY_UID } from '../../src/api/currency/constants';
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
      const existing = await this.strapi.documents(CURRENCY_UID).findFirst({
        filters: { code: currency.code },
      });
      if (existing) {
        await this.strapi.documents(CURRENCY_UID).update({
          documentId: existing.documentId,
          data: {
            symbol: currency.symbol,
            decimals: currency.decimals,
          },
        });
        continue;
      }

      await this.strapi.documents(CURRENCY_UID).create({
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
