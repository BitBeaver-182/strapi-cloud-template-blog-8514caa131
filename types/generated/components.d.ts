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
    product: Schema.Attribute.Relation<'manyToOne', 'api::product.product'>;
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

export interface SharedMedia extends Struct.ComponentSchema {
  collectionName: 'components_shared_media';
  info: {
    displayName: 'Media';
    icon: 'file-video';
  };
  attributes: {
    file: Schema.Attribute.Media<'images' | 'files' | 'videos'>;
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
    currency: Schema.Attribute.Relation<'manyToOne', 'api::currency.currency'> &
      Schema.Attribute.Required;
  };
}

export interface SharedQuote extends Struct.ComponentSchema {
  collectionName: 'components_shared_quotes';
  info: {
    displayName: 'Quote';
    icon: 'indent';
  };
  attributes: {
    body: Schema.Attribute.Text;
    title: Schema.Attribute.String;
  };
}

export interface SharedRichText extends Struct.ComponentSchema {
  collectionName: 'components_shared_rich_texts';
  info: {
    description: '';
    displayName: 'Rich text';
    icon: 'align-justify';
  };
  attributes: {
    body: Schema.Attribute.RichText;
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

export interface SharedSlider extends Struct.ComponentSchema {
  collectionName: 'components_shared_sliders';
  info: {
    description: '';
    displayName: 'Slider';
    icon: 'address-book';
  };
  attributes: {
    files: Schema.Attribute.Media<'images', true>;
  };
}

declare module '@strapi/strapi' {
  export module Public {
    export interface ComponentSchemas {
      'order.order-line': OrderOrderLine;
      'shared.media': SharedMedia;
      'shared.money': SharedMoney;
      'shared.quote': SharedQuote;
      'shared.rich-text': SharedRichText;
      'shared.seo': SharedSeo;
      'shared.slider': SharedSlider;
    }
  }
}
