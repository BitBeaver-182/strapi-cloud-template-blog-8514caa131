class Seeder {
  constructor(strapi, factories) {
    this.strapi = strapi;
    this.factories = factories;
  }

  /**
   * Run the seeder
   */
  async run() {
    throw new Error('Run method must be implemented in seeder');
  }

  /**
   * Get factory instance by name
   * @param {string} name - Factory name (e.g., 'UserFactory')
   * @returns {Factory}
   */
  factory(name) {
    if (!this.factories[name]) {
      throw new Error(`Factory "${name}" not found`);
    }
    return this.factories[name];
  }

  /**
   * Log seeding progress
   * @param {string} message
   */
  log(message) {
    console.log(`[SEED] ${message}`);
  }
}

module.exports = Seeder;
