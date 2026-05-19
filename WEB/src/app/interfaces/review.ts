export interface Review {
  _id?: string;
  email: string;
  product_id: string;
  message: string;
  rating: number;
  images?: string[];
  createdAt?: Date;
  updatedAt?: Date;
}
