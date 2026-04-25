import Seeder from './Seeder';

type SeedSupplier = {
  name: string;
  address: string;
  website?: string;
};

export default class SupplierSeeder extends Seeder {
  async run(): Promise<void> {
    this.log('Seeding suppliers...');

    const suppliers: SeedSupplier[] = [
      {
        name: 'Weifang Zhonglei Integrated Housing',
        address:
          'Shandong, China\nAlibaba: https://wfzhonglei.en.alibaba.com/index.html\nWebsite: https://zhongyihouses.com/',
        website: 'https://zhongyihouses.com/',
      },
      {
        name: 'Fucheng Huaying Integrated Housing',
        address:
          'Hebei, China\nAlibaba: http://fchuaying.en.alibaba.com/\nWebsite: https://www.huaying1.com/',
        website: 'https://www.huaying1.com/',
      },
      {
        name: 'GK Container House',
        address:
          'Shandong, China\nAlibaba: https://gkcontainerhouse.m.en.alibaba.com/\nWebsite: https://www.gkcpro.com/',
        website: 'https://www.gkcpro.com/',
      },
    ];

    for (const supplier of suppliers) {
      const existing = await this.strapi.entityService.findMany('api::supplier.supplier', {
        filters: { name: supplier.name },
        limit: 1,
      });
      const first = Array.isArray(existing) ? existing[0] : null;

      if (first) {
        await this.strapi.entityService.update('api::supplier.supplier', first.id, {
          data: {
            address: supplier.address,
            website: supplier.website,
          },
        });
        continue;
      }

      await this.strapi.entityService.create('api::supplier.supplier', {
        data: {
          name: supplier.name,
          address: supplier.address,
          website: supplier.website,
        },
      });
    }

    this.log(`Ensured ${suppliers.length} suppliers`);
  }
}

