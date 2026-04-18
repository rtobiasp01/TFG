import { Routes } from '@angular/router';
import { AdminLayout } from './layouts/admin-layout/admin-layout';
import { PublicLayout } from './layouts/public-layout/index';
import { Home } from './admin/pages/home/home';
import { ProductForm } from './admin/components/product-form/product-form';
import { Products } from './admin/pages/products/products';
import { Products as ProductsPublic } from './public/pages/products/products';
import { Variants } from './admin/pages/variants/variants';
import { Media } from './admin/pages/media/media';
import { Categories } from './admin/pages/categories/categories';
import { ProductDetails } from './public/pages/product-details/product-details';
import { Cart } from './public/pages/cart/cart';

export const routes: Routes = [
  {
    path: 'admin',
    component: AdminLayout,
    children: [
      {
        path: 'home',
        component: Home,
      },
      {
        path: 'products',
        component: Products,
      },
      {
        path: 'products/variants',
        component: Variants,
      },
      {
        path: 'products/categories',
        component: Categories,
      },
      {
        path: 'product-form/:id',
        component: ProductForm,
      },
      {
        path: 'product-form',
        component: ProductForm,
      },
      {
        path: 'media',
        component: Media,
      },
      {
        path: '',
        redirectTo: 'home',
        pathMatch: 'full',
      },
    ],
  },
  {
    path: '',
    component: PublicLayout,
    children: [
      {
        path: 'inicio',
        component: ProductsPublic,
      },
      {
        path: 'productos/:sku',
        component: ProductDetails,
      },
      {
        path: 'cart',
        component: Cart,
      },
      {
        path: '',
        redirectTo: 'inicio',
        pathMatch: 'full',
      },
    ],
  },
];
