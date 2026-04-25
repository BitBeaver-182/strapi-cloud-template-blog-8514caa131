import Factory from './Factory';

export default class CurrencyFactory extends Factory<'api::currency.currency'> {
  get model() {
    return 'api::currency.currency' as const;
  }

  definition() {
    const code = this.faker.string.alpha({ length: 3 }).toUpperCase();

    return {
      code,
      decimals: this.faker.number.int({ min: 0, max: 4 }),
      symbol: this.faker.finance.currencySymbol(),
    };
  }
}

