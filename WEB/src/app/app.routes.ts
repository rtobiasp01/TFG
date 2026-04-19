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
import { Settings } from './admin/pages/settings/settings';
import { ProductDetails } from './public/pages/product-details/product-details';
import { Cart } from './public/pages/cart/cart';
import { Login } from './public/pages/login/login';
import { Register } from './public/pages/register/register';
import { adminGuard, publicOnlyGuard } from './guards/auth-guards';

export const routes: Routes = [
  {
    path: 'admin',
    component: AdminLayout,
    canActivate: [adminGuard],
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
        path: 'settings',
        component: Settings,
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
        path: 'login',
        component: Login,
        canActivate: [publicOnlyGuard],
      },
      {
        path: 'register',
        component: Register,
        canActivate: [publicOnlyGuard],
      },
      {
        path: '',
        redirectTo: 'inicio',
        pathMatch: 'full',
      },
    ],
  },
];
