import { Routes } from '@angular/router';
import { Home } from './pages/home/home';
import { ProductForm } from './components/product-form/product-form';

export const routes: Routes = [
  {
    path: 'home',
    component: Home,
  },
  {
    path: 'product-form/:id',
    component: ProductForm,
  },
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full',
  },
];
