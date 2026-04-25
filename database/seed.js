/**
 * Strapi Database Seeder
 * 
 * Usage:
 *   npm run seed              # Run all seeders
 *   npm run seed UserSeeder   # Run specific seeder
 */

const loadFactories = require('./factories');
const DatabaseSeeder = require('./seeders/DatabaseSeeder');

async function seed(seederName = 'DatabaseSeeder') {
  let strapi;

  try {
    // Bootstrap Strapi
    console.log('Bootstrapping Strapi...');
    strapi = require('@strapi/strapi')();
    await strapi.load();

    console.log('Strapi loaded successfully!\n');

    // Load factories
    const factories = loadFactories(strapi);
    console.log(`Loaded ${Object.keys(factories).length} factories\n`);

    // Run seeder
    let SeederClass;
    
    if (seederName === 'DatabaseSeeder') {
      SeederClass = DatabaseSeeder;
    } else {
      // Try to load specific seeder
      SeederClass = require(`./seeders/${seederName}`);
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

// Get seeder name from command line args
const seederName = process.argv[2];
seed(seederName);
