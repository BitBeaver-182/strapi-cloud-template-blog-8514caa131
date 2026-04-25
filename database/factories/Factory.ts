import { faker } from '@faker-js/faker';
import type { Core } from '@strapi/strapi';

export default class Factory {
  constructor(strapi: Core.Strapi) {
    this.strapi = strapi;
    this.faker = faker;
  }

  private faker: typeof faker;
  private strapi: Core.Strapi;

  /**
   * Define the model's default state
   * @returns {Object}
   */
  definition() {
    throw new Error('Definition method must be implemented in factory');
  }

  /**
   * Create a single entry
   * @param {Object} attributes - Override attributes
   * @returns {Promise<Object>}
   */
  async create(attributes = {}) {
    const data = { ...this.definition(), ...attributes };
    return await this.strapi.entityService.create(this.model, { data });
  }

  /**
   * Create multiple entries
   * @param {number} count - Number of entries to create
   * @param {Object} attributes - Override attributes
   * @returns {Promise<Array>}
   */
  async createMany(count, attributes = {}) {
    const promises = [];
    for (let i = 0; i < count; i++) {
      promises.push(this.create(attributes));
    }
    return await Promise.all(promises);
  }

  /**
   * Create entry with custom state
   * @param {string} state - State name
   * @returns {Factory}
   */
  state(stateName: string): Factory {
    if (typeof this[stateName] !== 'function') {
      throw new Error(`State "${stateName}" does not exist`);
    }

    const stateData = this[stateName]();
    const originalDefinition = this.definition.bind(this);

    this.definition = () => ({
      ...originalDefinition(),
      ...stateData,
    });

    return this;
  }

  /**
   * Get the model identifier
   * @returns {string}
   */
  get model() {
    throw new Error('Model property must be defined in factory');
  }
}

module.exports = Factory;
