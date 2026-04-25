# Strapi Database Seeding System

A Laravel-inspired database seeding system for Strapi with separate factories and seeders.

## Installation

1. Install dependencies:
```bash
npm install --save-dev @faker-js/faker tsx
```

2. Add the scripts to your `package.json`:
```json
{
  "scripts": {
    "seed": "tsx database/seed.ts",
    "seed:specific": "tsx database/seed.ts"
  }
}
```

## Structure

```
database/
├── factories/
│   ├── Factory.ts           # Base factory class
│   ├── UserFactory.ts       # User factory
│   ├── CurrencyFactory.ts   # Currency factory
│   └── index.ts             # Factory loader
├── seeders/
│   ├── Seeder.ts            # Base seeder class
│   ├── DatabaseSeeder.ts    # Main seeder that calls others
│   ├── UserSeeder.ts        # User seeder
│   └── CurrencySeeder.ts    # Currency seeder
└── seed.ts                  # Main seed script
```

## Creating Factories

Create a new factory by extending the `Factory` class:

```typescript
// database/factories/ProductFactory.ts
import Factory from './Factory';

export default class ProductFactory extends Factory {
  get model(): string {
    return 'api::product.product'; // Your Strapi model
  }

  definition(): Record<string, unknown> {
    return {
      name: this.faker.commerce.productName(),
      price: parseFloat(this.faker.commerce.price()),
      description: this.faker.commerce.productDescription(),
      inStock: this.faker.datatype.boolean(),
    };
  }

  // Optional: Define states
  outOfStock() {
    return {
      inStock: false,
    };
  }

  expensive() {
    return {
      price: parseFloat(this.faker.commerce.price(1000, 5000)),
    };
  }
}
```

## Creating Seeders

Create a new seeder by extending the `Seeder` class:

```typescript
// database/seeders/ProductSeeder.ts
import Seeder from './Seeder';

export default class ProductSeeder extends Seeder {
  async run(): Promise<void> {
    this.log('Seeding products...');

    // Create 50 regular products
    await this.factory('ProductFactory').createMany(50);

    // Create 10 out-of-stock products
    await this.factory('ProductFactory')
      .state('outOfStock')
      .createMany(10);

    // Create a specific product
    await this.factory('ProductFactory').create({
      name: 'Special Product',
      price: 99.99,
    });

    this.log('Products seeded!');
  }
}
```

Then add it to your `DatabaseSeeder.ts`:

```typescript
async run(): Promise<void> {
  this.log('Starting database seeding...');

  await this.call('UserSeeder');
  await this.call('CurrencySeeder');
  await this.call('ProductSeeder'); // Add your new seeder

  this.log('Database seeding completed!');
}
```

## Usage

### Run all seeders:
```bash
npm run seed
```

### Run a specific seeder:
```bash
npm run seed:specific UserSeeder
npm run seed:specific CurrencySeeder
```

## Factory Methods

### `create(attributes)`
Create a single entry:
```typescript
const user = await this.factory('UserFactory').create({
  email: 'specific@email.com'
});
```

### `createMany(count, attributes)`
Create multiple entries:
```typescript
const users = await this.factory('UserFactory').createMany(10);
```

### `state(stateName)`
Use a predefined state:
```typescript
const admin = await this.factory('UserFactory')
  .state('admin')
  .create();
```

## Available Faker Methods

The factory has access to `this.faker` with all Faker.js methods:

- `this.faker.person.firstName()`
- `this.faker.person.lastName()`
- `this.faker.internet.email()`
- `this.faker.internet.userName()`
- `this.faker.lorem.paragraph()`
- `this.faker.lorem.sentence()`
- `this.faker.commerce.productName()`
- `this.faker.commerce.price()`
- `this.faker.datatype.boolean()`
- `this.faker.date.past()`
- `this.faker.date.future()`

See [Faker.js documentation](https://fakerjs.dev/) for all available methods.

## Advanced Usage

### Relations

```typescript
// In your seeder
const users = await this.strapi.entityService.findMany(
  'plugin::users-permissions.user'
);

const currency = await this.factory('CurrencyFactory').create({
  code: 'EUR',
  decimals: 2,
});
```

### Conditional Seeding

```typescript
async run() {
  const existingUsers = await this.strapi.entityService.findMany(
    'plugin::users-permissions.user',
    { limit: 1 }
  );

  if (existingUsers.length === 0) {
    await this.factory('UserFactory').createMany(10);
  }
}
```

### Custom Logic in Factories

```typescript
definition() {
  const firstName = this.faker.person.firstName();
  const lastName = this.faker.person.lastName();
  
  return {
    firstName,
    lastName,
    fullName: `${firstName} ${lastName}`,
    email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`,
  };
}
```

## Best Practices

1. **Separate Concerns**: Keep factories for data generation, seeders for orchestration
2. **Use States**: Define common variations as states in factories
3. **Idempotent Seeders**: Check if data exists before creating
4. **Order Matters**: Seed in dependency order (reference data before dependent data)
5. **Clear Logging**: Use `this.log()` to track seeding progress

## Troubleshooting

### "Factory not found" error
Make sure your factory file ends with `Factory.ts` and is in the `database/factories/` directory.

### "Model not found" error
Ensure the model identifier in `get model()` matches your Strapi content type exactly (e.g., `api::currency.currency`).

### Strapi not loading
Make sure Strapi is properly configured and your database is accessible.
