export interface AuthUser {
  _id: string;
  email: string;
  isAdmin: boolean;
  personalData?: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    documentId?: string;
  };
  shippingAddress?: {
    street?: string;
    city?: string;
    zipCode?: string;
    country?: string;
  };
}
