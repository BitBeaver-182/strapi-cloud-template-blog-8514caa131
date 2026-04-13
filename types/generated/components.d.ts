import type { Schema, Struct } from '@strapi/strapi';

export interface OrderOrderLine extends Struct.ComponentSchema {
  collectionName: 'components_order_order_lines';
  info: {
    description: 'Product line on an order';
    displayName: 'Order line';
    icon: 'layer';
    name: 'order-line';
  };
  attributes: {
    line_total: Schema.Attribute.Component<'shared.money', false>;
    quantity: Schema.Attribute.Decimal &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      > &
      Schema.Attribute.DefaultTo<1>;
    unit_price: Schema.Attribute.Component<'shared.money', false> &
      Schema.Attribute.Required;
  };
}

export interface SharedMoney extends Struct.ComponentSchema {
  collectionName: 'components_shared_monies';
  info: {
    description: 'Amount with currency \u2014 reuse on any content type';
    displayName: 'Money';
    icon: 'coins';
    name: 'money';
  };
  attributes: {
    amount: Schema.Attribute.Decimal & Schema.Attribute.Required;
    currency_code: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 3;
        minLength: 3;
      }>;
  };
}

export interface SharedSeo extends Struct.ComponentSchema {
  collectionName: 'components_shared_seos';
  info: {
    description: '';
    displayName: 'Seo';
    icon: 'allergies';
    name: 'Seo';
  };
  attributes: {
    metaDescription: Schema.Attribute.Text & Schema.Attribute.Required;
    metaTitle: Schema.Attribute.String & Schema.Attribute.Required;
    shareImage: Schema.Attribute.Media<'images'>;
  };
}

declare module '@strapi/strapi' {
  export module Public {
    export interface ComponentSchemas {
      'order.order-line': OrderOrderLine;
      'shared.money': SharedMoney;
      'shared.seo': SharedSeo;
    }
  }
}
