import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CategoryService } from '../../services/category-service';
import { Category } from '../../interfaces/category';

@Component({
  selector: 'app-categories',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './categories.html',
  styleUrl: './categories.css',
})
export class Categories {
  private categoryService = inject(CategoryService);

  categories = signal<Category[]>([]);
  showForm = signal(false);
  editingId = signal<string | null>(null);

  newCategory = {
    name: '',
    description: '',
    visible: true,
  };

  constructor() {
    this.loadCategories();
  }

  loadCategories() {
    this.categoryService.getAll().subscribe({
      next: (data) => this.categories.set(data),
      error: (err) => console.error('Error al cargar categorías:', err),
    });
  }

  toggleForm() {
    this.showForm.update((v) => !v);
    if (!this.showForm()) {
      this.resetForm();
    }
  }

  editCategory(category: Category) {
    this.editingId.set(category._id || null);
    this.newCategory = {
      name: category.name,
      description: category.description || '',
      visible: category.visible !== undefined ? category.visible : true,
    };
    this.showForm.set(true);
  }

  saveCategory() {
    if (!this.newCategory.name.trim()) {
      alert('El nombre de la categoría es obligatorio');
      return;
    }

    if (this.editingId()) {
      this.categoryService.update(this.editingId()!, this.newCategory).subscribe({
        next: () => {
          this.loadCategories();
          this.resetForm();
        },
        error: (err) => console.error('Error al actualizar categoría:', err),
      });
    } else {
      this.categoryService.create(this.newCategory).subscribe({
        next: () => {
          this.loadCategories();
          this.resetForm();
        },
        error: (err) => console.error('Error al crear categoría:', err),
      });
    }
  }

  deleteCategory(id: string | undefined) {
    if (!id) return;

    if (confirm('¿Estás seguro de que deseas eliminar esta categoría?')) {
      this.categoryService.delete(id).subscribe({
        next: () => {
          this.loadCategories();
        },
        error: (err) => console.error('Error al eliminar categoría:', err),
      });
    }
  }

  resetForm() {
    this.newCategory = { name: '', description: '', visible: true };
    this.editingId.set(null);
    this.showForm.set(false);
  }
}
