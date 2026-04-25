import type { Core } from '@strapi/strapi';

import CurrencyFactory from './CurrencyFactory';
import QuoteFactory from './QuoteFactory';
import SupplierFactory from './SupplierFactory';
import UserFactory from './UserFactory';

export type Factories = {
  CurrencyFactory: CurrencyFactory;
  QuoteFactory: QuoteFactory;
  SupplierFactory: SupplierFactory;
  UserFactory: UserFactory;
};

export default function loadFactories(strapi: Core.Strapi): Factories {
  return {
    CurrencyFactory: new CurrencyFactory(strapi),
    QuoteFactory: new QuoteFactory(strapi),
    SupplierFactory: new SupplierFactory(strapi),
    UserFactory: new UserFactory(strapi),
  };
}

