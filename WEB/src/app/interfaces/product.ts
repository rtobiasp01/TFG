
import { PhysicalAttributes } from './physical_attributes'

export interface Product {
  _id: string;
  title: string;
  price: number;
  description: string;
  sku: string;
  stock_quantity: number;
  physical_attributes?: PhysicalAttributes;
  image: string;
}
