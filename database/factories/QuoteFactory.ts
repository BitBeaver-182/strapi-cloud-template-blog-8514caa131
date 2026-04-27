import { QUOTE_UID } from '../../src/api/quote/constants';
import Factory from './Factory';

export default class QuoteFactory extends Factory<typeof QUOTE_UID> {
  get uid(): typeof QUOTE_UID {
    return QUOTE_UID;
  }

  definition() {
    const quotationDate = this.faker.date.recent({ days: 30 });
    const expirationDate = new Date(quotationDate);
    expirationDate.setDate(expirationDate.getDate() + 30);

    return {
      quotation_date: quotationDate.toISOString().slice(0, 10),
      expiration_date: expirationDate.toISOString().slice(0, 10),
      quote_status: this.faker.helpers.arrayElement(['pending', 'accepted', 'rejected']),
      notes: this.faker.lorem.paragraph(),
      total: {
        amount: this.faker.number.int({ min: 1000, max: 50000 }),
        currency_code: this.faker.helpers.arrayElement(['USD', 'EUR', 'CNY', 'HUF']),
      },
    };
  }
}
