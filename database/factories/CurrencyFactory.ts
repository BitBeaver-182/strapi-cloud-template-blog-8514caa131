import { CURRENCY_UID } from '../../src/api/currency/constants';
import Factory from './Factory';

export default class CurrencyFactory extends Factory<typeof CURRENCY_UID> {
  get uid(): typeof CURRENCY_UID {
    return CURRENCY_UID;
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
