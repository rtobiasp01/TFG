import { Routes } from '@angular/router';
import { Home } from './pages/home/home';
import { ProductForm } from './components/product-form/product-form';
import { Products } from './pages/products/products';
import { Atributes } from './pages/atributes/atributes';

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
    path: 'products/atributes',
    component: Atributes,
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
