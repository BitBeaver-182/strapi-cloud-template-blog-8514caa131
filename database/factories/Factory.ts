import { faker } from '@faker-js/faker';
import type { Core } from '@strapi/strapi';
import type { Modules, UID } from '@strapi/types';

export default abstract class Factory<TUID extends UID.ContentType> {
  protected faker: typeof faker;
  protected strapi: Core.Strapi;

  constructor(strapi: Core.Strapi) {
    this.strapi = strapi;
    this.faker = faker;
  }

  /**
   * Define the model's default state
   * @returns {Object}
   */
  abstract definition(): Modules.EntityService.Params.Data.Input<TUID>;

  /**
   * Create a single entry
   * @param {Object} attributes - Override attributes
   * @returns {Promise<Object>}
   */
  async create(attributes: Partial<Modules.EntityService.Params.Data.Input<TUID>> = {}) {
    const data = { ...this.definition(), ...attributes };
    return await this.strapi.entityService.create(this.model, { data });
  }

  /**
   * Create multiple entries
   * @param {number} count - Number of entries to create
   * @param {Object} attributes - Override attributes
   * @returns {Promise<Array>}
   */
  async createMany(count: number, attributes: Partial<Modules.EntityService.Params.Data.Input<TUID>> = {}) {
    const promises: Array<ReturnType<typeof this.create>> = [];
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
  state(stateName: string): this {
    const stateFn = (this as unknown as Record<string, unknown>)[stateName];
    if (typeof stateFn !== 'function') {
      throw new Error(`State "${stateName}" does not exist`);
    }

    const stateData = (stateFn as () => Partial<Modules.EntityService.Params.Data.Input<TUID>>).call(this);
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
  abstract get model(): TUID;
}
