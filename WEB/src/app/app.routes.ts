import { Routes } from '@angular/router';
import { Home } from './admin/pages/home/home';
import { ProductForm } from './admin/components/product-form/product-form';
import { Products } from './admin/pages/products/products';
import { Products as ProductsPublic } from './public/pages/products/products';
import { Variants } from './admin/pages/variants/variants';
import { Media } from './admin/pages/media/media';
import { Categories } from './admin/pages/categories/categories';

export const routes: Routes = [
  {
    path: 'admin/home',
    component: Home,
  },
  {
    path: 'admin/products',
    component: Products,
  },
  {
    path: 'admin/products/variants',
    component: Variants,
  },
  {
    path: 'admin/products/categories',
    component: Categories,
  },
  {
    path: 'admin/product-form/:id',
    component: ProductForm,
  },
  {
    path: 'admin/product-form',
    component: ProductForm,
  },
  {
    path: '',
    redirectTo: 'admin/home',
    pathMatch: 'full',
  },
  {
    path: 'admin/media',
    component: Media,
  },
  {
    path: 'inicio',
    component: ProductsPublic,
  }
];
