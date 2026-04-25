import fs from 'node:fs';
import path from 'node:path';

import Seeder from './Seeder';

type UploadedFile = { id: number };

type UploadService = {
  upload(input: {
    data?: Record<string, unknown>;
    files: {
      filepath: string;
      originalFilename: string;
      mimetype: string;
      size: number;
    };
  }): Promise<UploadedFile[]>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function getUploadService(strapi: unknown): UploadService {
  if (!isRecord(strapi)) {
    throw new Error('Invalid Strapi instance');
  }
  const pluginFn = strapi.plugin;
  if (typeof pluginFn !== 'function') {
    throw new Error('Strapi plugin() API not available');
  }
  const uploadPlugin = pluginFn.call(strapi, 'upload');
  if (!isRecord(uploadPlugin)) {
    throw new Error('Upload plugin not available');
  }
  const serviceFn = uploadPlugin.service;
  if (typeof serviceFn !== 'function') {
    throw new Error('Upload plugin service() API not available');
  }
  const uploadService = serviceFn.call(uploadPlugin, 'upload');
  if (!isRecord(uploadService) || typeof uploadService.upload !== 'function') {
    throw new Error('Upload service upload() not available');
  }
  return uploadService as UploadService;
}

export default class QuoteSeeder extends Seeder {
  async run(): Promise<void> {
    this.log('Seeding quotes...');

    const targetQuotes = 20;
    const existingCount = await this.strapi.entityService.count('api::quote.quote');
    const remaining = Math.max(0, targetQuotes - existingCount);
    if (remaining === 0) {
      this.log(`Quotes already exist (${existingCount}). Nothing to do.`);
      return;
    }

    const suppliers = await this.strapi.entityService.findMany('api::supplier.supplier', {
      fields: ['id', 'name'],
      sort: ['name:asc'],
      limit: 100,
    });

    const supplierList = Array.isArray(suppliers) ? suppliers : [];
    if (supplierList.length === 0) {
      this.log('No suppliers found. Skipping quote seeding.');
      return;
    }

    const pdfPaths = [
      path.resolve(process.cwd(), 'Apple-kabin.pdf'),
      path.resolve(process.cwd(), 'Fchueng APPLE-1.pdf'),
      path.resolve(process.cwd(), 'Fucheng empty house 5850-1.pdf'),
    ].filter((p) => fs.existsSync(p));

    const upload = getUploadService(this.strapi);

    const uploadedPdfIds: number[] = [];
    for (const pdfPath of pdfPaths) {
      const stat = fs.statSync(pdfPath);
      const uploaded = await upload.upload({
        data: {},
        files: {
          filepath: pdfPath,
          originalFilename: path.basename(pdfPath),
          mimetype: 'application/pdf',
          size: stat.size,
        },
      });

      if (uploaded.length > 0) {
        uploadedPdfIds.push(uploaded[0].id);
      }
    }

    for (let i = 0; i < remaining; i++) {
      const supplier = supplierList[i % supplierList.length];
      const base = this.factory('QuoteFactory').definition();

      const pdfId = uploadedPdfIds.length > 0 ? uploadedPdfIds[i % uploadedPdfIds.length] : undefined;
      const notes = [
        base.notes ?? '',
        `Supplier: ${supplier.name}`,
        'Models: Apple Cabin (LUX/TERRA/LUNA), Harmonia (START/COMFORT/PREMIUM), House AURA',
      ]
        .filter((x) => typeof x === 'string' && x.trim().length > 0)
        .join('\n');

      await this.strapi.entityService.create('api::quote.quote', {
        data: {
          ...base,
          notes,
          supplier: supplier.id,
          ...(pdfId ? { pdf: pdfId } : {}),
        },
      });
    }

    this.log(`Created ${remaining} quotes (target: ${targetQuotes})`);
  }
}

