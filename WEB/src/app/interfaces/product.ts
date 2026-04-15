import { PhysicalAttributes } from './physical_attributes';
import { Variant } from './variant';
import { CustomizationConfig, ProductType, UserCustomization } from './customization';

export interface Product {
  _id: string;
  title: string;
  short_description?: string;
  price: number;
  sale_price?: number | null;
  description: string;
  type: ProductType;
  sku: string;
  slug?: string;
  stock_status?: string;
  stock_quantity: number;
  manage_stock?: boolean;
  physical_attributes?: PhysicalAttributes | null;
  variantes?: Variant[];
  customization_config?: CustomizationConfig | null;
  user_customization?: UserCustomization | null;
  image: string;
  gallery?: string[];
  categoria?: string[];
}
