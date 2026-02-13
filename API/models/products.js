class Product {
  constructor(
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
    dim_l = 0,
    dim_w = 0,
    dim_h = 0,
    weight = 0,
    average_rating = 0,
    custom_slug = null,
    image = null,
  ) {
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

    this.dimensions = {
      l: Number(dim_l),
      w: Number(dim_w),
      h: Number(dim_h),
      weight: Number(weight),
    };

    this.average_rating = Number(average_rating);

    this.image = image;

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
}

module.exports = Product;
