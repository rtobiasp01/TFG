import { Atribute } from './atribute';
import { Dimensions } from './dimensions';

export interface Product {
  _id: string;
  title: string;
  price: number;
  description: string;
  sku: string;
  stock_quantity: number;
  dimensions: Dimensions;
  image: string;
  atributes: Atribute[];
}
