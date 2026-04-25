const Seeder = require('./Seeder');

class DatabaseSeeder extends Seeder {
  async run() {
    this.log('Starting database seeding...');

    // Seed users
    await this.call('UserSeeder');

    // Seed articles
    await this.call('ArticleSeeder');

    this.log('Database seeding completed!');
  }

  /**
   * Call another seeder
   * @param {string} seederName
   */
  async call(seederName) {
    const SeederClass = require(`./${seederName}`);
    const seeder = new SeederClass(this.strapi, this.factories);
    await seeder.run();
  }
}

module.exports = DatabaseSeeder;
