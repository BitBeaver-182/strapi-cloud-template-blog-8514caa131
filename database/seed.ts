/**
 * Strapi Database Seeder
 *
 * Usage:
 *   npm run seed                     # Run all seeders
 *   npm run seed:specific UserSeeder # Run a specific seeder
 */

import loadFactories from './factories';
import DatabaseSeeder from './seeders/DatabaseSeeder';
import CurrencySeeder from './seeders/CurrencySeeder';
import UserSeeder from './seeders/UserSeeder';

import { compileStrapi, createStrapi, type Core } from '@strapi/strapi';
import tsUtils = require('@strapi/typescript-utils');

import type { Factories } from './factories';
import type Seeder from './seeders/Seeder';

type SeederCtor = new (strapi: Core.Strapi, factories: Factories) => Seeder;
type SeederName = 'DatabaseSeeder' | 'UserSeeder' | 'CurrencySeeder';

const SEEDERS: Record<SeederName, SeederCtor> = {
  DatabaseSeeder,
  UserSeeder,
  CurrencySeeder,
};

async function seed(seederName = 'DatabaseSeeder') {
  let strapi: Core.Strapi | undefined;

  try {
    console.log('Bootstrapping Strapi...');
    const appDir = process.cwd();
    const distDir = await (tsUtils as unknown as { resolveOutDir(dir: string): Promise<string> }).resolveOutDir(
      appDir
    );

    await compileStrapi({ appDir, ignoreDiagnostics: false });
    strapi = await createStrapi({ appDir, distDir }).load();

    console.log('Strapi loaded successfully!\n');

    const factories = loadFactories(strapi);
    console.log(`Loaded ${Object.keys(factories).length} factories\n`);

    const SeederClass = SEEDERS[seederName as SeederName];
    if (!SeederClass) {
      throw new Error(
        `Seeder "${seederName}" not found. Available seeders: ${Object.keys(SEEDERS).join(', ')}`
      );
    }

    const seeder = new SeederClass(strapi, factories);
    await seeder.run();

    console.log('\n✅ Seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    if (strapi) {
      await strapi.destroy();
    }
  }
}

const seederName = process.argv[2];
seed(seederName);

