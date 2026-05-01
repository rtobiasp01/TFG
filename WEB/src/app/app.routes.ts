import { Routes } from '@angular/router';
import { AdminLayout } from './layouts/admin-layout/admin-layout';
import { PublicLayout } from './layouts/public-layout/index';
import { Home } from './admin/pages/home/home';
import { ProductForm } from './admin/components/product-form/product-form';
import { Products } from './admin/pages/products/products';
import { Products as ProductsCatalog } from './public/pages/products/products';
import { HomeLanding } from './public/pages/home/home';
import { Variants } from './admin/pages/variants/variants';
import { Media } from './admin/pages/media/media';
import { Categories } from './admin/pages/categories/categories';
import { Settings } from './admin/pages/settings/settings';
import { AdminOrders } from './admin/pages/orders/orders';
import { ProductDetails } from './public/pages/product-details/product-details';
import { Cart } from './public/pages/cart/cart';
import { Checkout } from './public/pages/checkout/checkout';
import { Orders } from './public/pages/orders/orders';
import { Login } from './public/pages/login/login';
import { Register } from './public/pages/register/register';
import { adminGuard, authGuard, publicOnlyGuard } from './guards/auth-guards';

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
        path: 'pedidos',
        component: AdminOrders,
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
        component: HomeLanding,
      },
      {
        path: 'productos',
        component: ProductsCatalog,
      },
      {
        path: 'productos/:sku',
        component: ProductDetails,
      },
      {
        path: 'pedidos',
        component: Orders,
      },
      {
        path: 'cart',
        component: Cart,
      },
      {
        path: 'checkout',
        component: Checkout,
        canActivate: [authGuard],
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
