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
    variantes = [],
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
    this.physical_attributes = this.normalizePhysicalAttributes(physical_attributes);

    // Variantes del producto
    this.variantes = Array.isArray(variantes)
      ? variantes.map((variant, index) => this.normalizeVariant(variant, index))
      : [];

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

  normalizeVariant(variant, index) {
    const {
      sku: _ignoredSku,
      imagenes = [],
      stock = 0,
      precio_adicional = 0,
      physical_attributes,
      attributes = {},
      ...dynamicFields
    } = variant || {};

    const dynamicAttributes =
      attributes && typeof attributes === "object" && !Array.isArray(attributes)
        ? attributes
        : {};

    const mergedDynamicAttributes = {
      ...dynamicFields,
      ...dynamicAttributes,
    };

    const resolvedPhysicalAttributes =
      this.normalizePhysicalAttributes(physical_attributes) ||
      (this.physical_attributes ? { ...this.physical_attributes } : null);

    // precio_adicional se suma al precio base del producto padre
    const parsedAdditionalPrice = Number(precio_adicional);
    const normalizedVariant = {
      sku: this.buildVariantSku(mergedDynamicAttributes, index),
      ...mergedDynamicAttributes,
      stock: Number.parseInt(stock, 10) || 0,
      precio_adicional: Number.isFinite(parsedAdditionalPrice)
        ? parsedAdditionalPrice
        : 0,
      imagenes: Array.isArray(imagenes)
        ? imagenes.filter((img) => typeof img === "string")
        : [],
    };

    // Si la variante no define atributos físicos, hereda del producto padre
    if (resolvedPhysicalAttributes) {
      normalizedVariant.physical_attributes = resolvedPhysicalAttributes;
    }

    return normalizedVariant;
  }

  buildVariantSku(dynamicAttributes, index) {
    const baseSku =
      this.sku || this.slug || this.generateSlug(this.title) || "PROD";

    const normalizedBaseSku = baseSku
      .toString()
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    const attributeParts = Object.values(dynamicAttributes)
      .map((value) =>
        (value || "")
          .toString()
          .toUpperCase()
          .replace(/[^A-Z0-9]+/g, "-")
          .replace(/^-+|-+$/g, ""),
      )
      .filter(Boolean);

    if (attributeParts.length === 0) {
      attributeParts.push(`VAR${index + 1}`);
    }

    return [normalizedBaseSku, ...attributeParts].join("-");
  }

  normalizePhysicalAttributes(physicalAttributes) {
    if (
      !physicalAttributes ||
      typeof physicalAttributes !== "object" ||
      Array.isArray(physicalAttributes)
    ) {
      return null;
    }

    const normalized = {};

    if (physicalAttributes.length !== undefined) {
      normalized.length = this.toNumericIfPossible(physicalAttributes.length);
    }

    if (physicalAttributes.width !== undefined) {
      normalized.width = this.toNumericIfPossible(physicalAttributes.width);
    }

    if (physicalAttributes.height !== undefined) {
      normalized.height = this.toNumericIfPossible(physicalAttributes.height);
    }

    const weightValue =
      physicalAttributes.weight !== undefined
        ? physicalAttributes.weight
        : physicalAttributes.peso;

    if (weightValue !== undefined) {
      normalized.weight = this.toNumericIfPossible(weightValue);
    }

    for (const [key, value] of Object.entries(physicalAttributes)) {
      if (!["length", "width", "height", "weight", "peso"].includes(key)) {
        normalized[key] = value;
      }
    }

    return Object.keys(normalized).length > 0 ? normalized : null;
  }

  toNumericIfPossible(value) {
    const parsedNumber = Number(value);
    return Number.isFinite(parsedNumber) ? parsedNumber : value;
  }
}

module.exports = Product;
