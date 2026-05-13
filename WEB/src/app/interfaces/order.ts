export interface Order {
  _id: string;
  user_id: string;
  items: OrderItem[];
  total: number;
  status: 'pendiente' | 'confirmado' | 'enviado' | 'entregado' | 'cancelado';
  personalData?: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    documentId?: string;
  };
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
    uploadedImageUrl?: string | null;
    imagePlacement?: any;
    textPlacement?: any;
  };
}

export type OrderStatus = 'pendiente' | 'confirmado' | 'enviado' | 'entregado' | 'cancelado';
