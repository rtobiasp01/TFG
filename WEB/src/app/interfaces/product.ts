
import { PhysicalAttributes } from './physical_attributes'
import { Variant } from './variant';

export interface Product {
  _id: string;
  title: string;
  short_description?: string;
  price: number;
  sale_price?: number | null;
  description: string;
  type: string;
  sku: string;
  stock_status?: string;
  stock_quantity: number;
  manage_stock?: boolean;
  physical_attributes?: PhysicalAttributes | null;
  variantes?: Variant[];
  image: string;
}
