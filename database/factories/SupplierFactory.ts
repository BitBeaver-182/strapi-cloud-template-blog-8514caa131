import { SUPPLIER_UID } from '../../src/api/supplier/constants';
import Factory from './Factory';


export default class SupplierFactory extends Factory<typeof SUPPLIER_UID> {
  get uid(): typeof SUPPLIER_UID {
    return SUPPLIER_UID;
  }

  definition() {
    return {
      name: this.faker.company.name(),
      address: `${this.faker.location.city()}, ${this.faker.location.country()}`,
      website: this.faker.internet.url(),
      phone_number: this.faker.phone.number(),
    };
  }
}
