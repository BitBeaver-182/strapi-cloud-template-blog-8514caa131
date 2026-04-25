import type { Core } from '@strapi/strapi';

import CurrencyFactory from './CurrencyFactory';
import UserFactory from './UserFactory';

export type Factories = {
  CurrencyFactory: CurrencyFactory;
  UserFactory: UserFactory;
};

export default function loadFactories(strapi: Core.Strapi): Factories {
  return {
    CurrencyFactory: new CurrencyFactory(strapi),
    UserFactory: new UserFactory(strapi),
  };
}

