import { SUPPLIER_UID } from '../../src/api/supplier/constants';
import { Supplier } from '../../src/api/supplier/types';
import Seeder from './Seeder';

type SeedSupplier = Partial<Supplier>

export default class SupplierSeeder extends Seeder {
  async run(): Promise<void> {
    this.log('Seeding suppliers...');

    const suppliers: SeedSupplier[] = [
      {
        name: 'Weifang Zhonglei Integrated Housing',
        address:
          'Shandong, China\nAlibaba: https://wfzhonglei.en.alibaba.com/index.html\nWebsite: https://zhongyihouses.com/',
        website: 'https://zhongyihouses.com/',
        phone_number: '+86 13864111111',
      },
      {
        name: 'Fucheng Huaying Integrated Housing',
        address:
          'Hebei, China\nAlibaba: http://fchuaying.en.alibaba.com/\nWebsite: https://www.huaying1.com/',
        website: 'https://www.huaying1.com/',
        phone_number: '+86 13864111111',
      },
      {
        name: 'GK Container House',
        address:
          'Shandong, China\nAlibaba: https://gkcontainerhouse.m.en.alibaba.com/\nWebsite: https://www.gkcpro.com/',
        website: 'https://www.gkcpro.com/',
        phone_number: '+86 13864111111',
      },
    ];



    for (const supplier of suppliers) {
      const existing = await this.strapi.documents(SUPPLIER_UID).findFirst({
        filters: { name: supplier.name },
      });

      if (existing) {
        await this.strapi.documents(SUPPLIER_UID).update({
          documentId: existing.documentId,
          data: {
            address: supplier.address,
            website: supplier.website,
          },
        });
        continue;
      }

      await this.strapi.documents(SUPPLIER_UID).create({
        data: {
          name: supplier.name,
          address: supplier.address,
          website: supplier.website,
          phone_number: supplier.phone_number,
        },
      });
    }

    this.log(`Ensured ${suppliers.length} suppliers`);
  }
}
