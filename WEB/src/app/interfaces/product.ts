
import { PhysicalAttributes } from './physical_attributes'

export interface Product {
  _id: string;
  title: string;
  price: number;
  description: string;
  type: string;
  sku: string;
  stock_quantity: number;
  manage_stock?: boolean;
  physical_attributes?: PhysicalAttributes;
  image: string;
}
