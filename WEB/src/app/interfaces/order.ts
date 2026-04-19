export interface Order {
  _id: string;
  user_id: string;
  items: OrderItem[];
  total: number;
  status: 'pendiente' | 'confirmado' | 'enviado' | 'entregado' | 'cancelado';
  shippingAddress: {
    street?: string;
    city?: string;
    zipCode?: string;
    country?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderItem {
  product_id: string;
  productTitle?: string;
  quantity: number;
  price: number;
  basePrice?: number;
  variantAdditionalPrice?: number;
  customization?: {
    customText?: string;
    imagePlacement?: any;
    textPlacement?: any;
  };
}

export type OrderStatus = 'pendiente' | 'confirmado' | 'enviado' | 'entregado' | 'cancelado';
