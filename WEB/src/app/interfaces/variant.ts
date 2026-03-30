import { PhysicalAttributes } from './physical_attributes';

export interface Variant {
  sku?: string;
  stock: number;
  precio_adicional: number;
  imagenes: string[];
  attributes?: Record<string, string | number>;
  physical_attributes?: PhysicalAttributes | Record<string, string | number>;
  [key: string]: string | number | string[] | PhysicalAttributes | Record<string, string | number> | undefined;
}
