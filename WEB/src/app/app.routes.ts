import { Routes } from '@angular/router';
import { Home } from './pages/home/home';
import { ProductForm } from './components/product-form/product-form';
import { Products } from './pages/products/products';

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
];
