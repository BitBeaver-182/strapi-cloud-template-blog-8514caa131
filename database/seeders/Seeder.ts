import type { Core } from '@strapi/strapi';

import type { Factories } from '../factories';

export default abstract class Seeder {
  protected strapi: Core.Strapi;
  protected factories: Factories;

  constructor(strapi: Core.Strapi, factories: Factories) {
    this.strapi = strapi;
    this.factories = factories;
  }

  abstract run(): Promise<void>;

  factory<TName extends keyof Factories & string>(name: TName): Factories[TName] {
    const factory = this.factories[name];
    if (!factory) {
      throw new Error(`Factory "${name}" not found`);
    }
    return factory;
  }

  log(message: string) {
    console.log(`[SEED] ${message}`);
  }
}

