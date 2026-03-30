class Product {
  constructor({
    title,
    description,
    short_description,
    price,
    sale_price = null,
    sku = "",
    stock_status = "in_stock",
    stock_quantity = 0,
    manage_stock = false,
    type = "simple",
    physical_attributes = null,
    average_rating = 0,
    custom_slug = null,
    image = null,
    gallery = [],
    visible = true,
  } = {}) {
    this.title = title;
    this.description = description;
    this.short_description = short_description;
    this.price = Number(price);
    this.sale_price = sale_price ? Number(sale_price) : null;
    this.sku = sku;
    this.stock_status = stock_status;
    this.stock_quantity = Number(stock_quantity);
    this.manage_stock = Boolean(manage_stock);
    this.type = type;

    // Atributos físicos
    if (physical_attributes) {
      this.physical_attributes = {
        length: Number(physical_attributes.length),
        width: Number(physical_attributes.width),
        height: Number(physical_attributes.height),
        weight: Number(physical_attributes.weight),
      };
    }

    this.average_rating = Number(average_rating);

    // Gestión de imágenes
    this.image = image;
    this.gallery = Array.isArray(gallery) ? gallery : [];

    // Visibilidad
    this.visible = Boolean(visible);

    this.slug = custom_slug || this.generateSlug(this.title);
  }

  /**
   * Método para transformar el título en un slug limpio
   */
  generateSlug(text) {
    if (!text) return "";
    return text
      .toString()
      .toLowerCase()
      .trim()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9 -]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");
  }

  /**
   * Método de utilidad para añadir una foto a la galería
   */
  addGalleryImage(url) {
    if (url && typeof url === "string") {
      this.gallery.push(url);
    }
  }
}

module.exports = Product;
