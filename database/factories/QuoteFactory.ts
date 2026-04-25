import Factory from './Factory';

export default class QuoteFactory extends Factory<'api::quote.quote'> {
  get model() {
    return 'api::quote.quote' as const;
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
        amount: String(this.faker.number.int({ min: 1000, max: 50000 })),
        currency_code: this.faker.helpers.arrayElement(['USD', 'EUR', 'CNY', 'HUF']),
      },
    };
  }
}

