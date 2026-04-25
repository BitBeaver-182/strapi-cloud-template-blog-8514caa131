import Factory from './Factory';

export default class SupplierFactory extends Factory<'api::supplier.supplier'> {
  get model() {
    return 'api::supplier.supplier' as const;
  }

  definition() {
    return {
      name: this.faker.company.name(),
      address: `${this.faker.location.city()}, ${this.faker.location.country()}`,
      website: this.faker.internet.url(),
    };
  }
}

