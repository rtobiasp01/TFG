import { Routes } from '@angular/router';
import { Home } from './pages/home/home';
import { ProductForm } from './components/product-form/product-form';
import { Products } from './pages/products/products';
import { Variants } from './pages/variants/variants';
import { Media } from './pages/media/media';import { Categories } from './pages/categories/categories';
export const routes: Routes = [
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
    path: '',
    redirectTo: 'home',
    pathMatch: 'full',
  },
  {
    path: 'media',
    component: Media,
  }
];
