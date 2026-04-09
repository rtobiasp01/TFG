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
    categoria = [],
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

    this.physical_attributes = this.normalizePhysicalAttributes(physical_attributes);

    this.variantes = Array.isArray(variantes)
      ? this.normalizeVariants(variantes)
      : [];

    this.average_rating = Number(average_rating);

    if (Array.isArray(categoria)) {
      this.categoria = categoria
        .map((item) => String(item).trim())
        .filter((item) => item.length > 0);
    } else if (typeof categoria === "string") {
      this.categoria = categoria
        .split(",")
        .map((item) => item.trim())
        .filter((item) => item.length > 0);
    } else {
      this.categoria = [];
    }

    this.image = image;
    this.gallery = Array.isArray(gallery) ? gallery : [];

    this.visible = Boolean(visible);

    this.slug = custom_slug || this.generateSlug(this.title);
  }

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

  addGalleryImage(url) {
    if (url && typeof url === "string") {
      this.gallery.push(url);
    }
  }

  normalizeVariants(variantes) {
    return variantes.flatMap((variant, variantIndex) => {
      const expandedVariants = this.expandVariantCombinations(variant);
      return expandedVariants.map((combinationVariant, combinationIndex) =>
        this.normalizeVariant(
          combinationVariant,
          variantIndex,
          combinationIndex,
        ),
      );
    });
  }

  normalizeVariant(variant, variantIndex, combinationIndex = 0) {
    const {
      sku: _ignoredSku,
      imagenes = [],
      stock_quantity,
      stock: legacyStock = 0,
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

    const parsedAdditionalPrice = Number(precio_adicional);
    const resolvedStock =
      stock_quantity !== undefined ? stock_quantity : legacyStock;
    const normalizedVariant = {
      sku: this.buildVariantSku(
        mergedDynamicAttributes,
        variantIndex,
        combinationIndex,
      ),
      ...mergedDynamicAttributes,
      stock_quantity: Number.parseInt(resolvedStock, 10) || 0,
      precio_adicional: Number.isFinite(parsedAdditionalPrice)
        ? parsedAdditionalPrice
        : 0,
      imagenes: Array.isArray(imagenes)
        ? imagenes.filter((img) => typeof img === "string")
        : [],
    };

    if (resolvedPhysicalAttributes) {
      normalizedVariant.physical_attributes = resolvedPhysicalAttributes;
    }

    return normalizedVariant;
  }

  expandVariantCombinations(variant) {
    if (!variant || typeof variant !== "object") {
      return [];
    }

    const source = { ...variant };
    const explicitAttributes =
      source.attributes &&
      typeof source.attributes === "object" &&
      !Array.isArray(source.attributes)
        ? { ...source.attributes }
        : {};

    const reservedKeys = new Set([
      "sku",
      "stock",
      "stock_quantity",
      "precio_adicional",
      "imagenes",
      "physical_attributes",
      "attributes",
      "_id",
    ]);

    Object.keys(source).forEach((key) => {
      if (reservedKeys.has(key)) {
        return;
      }

      if (explicitAttributes[key] !== undefined) {
        return;
      }

      explicitAttributes[key] = source[key];
    });

    const attributeEntries = Object.entries(explicitAttributes)
      .filter(([, value]) => value !== undefined && value !== null)
      .map(([key, value]) => {
        const values = Array.isArray(value)
          ? value.filter((item) => item !== undefined && item !== null)
          : [value];

        return {
          key,
          values: values.length > 0 ? values : [""],
        };
      });

    if (attributeEntries.length === 0) {
      return [source];
    }

    const combinations = [];

    const combine = (position, currentAttributes) => {
      if (position >= attributeEntries.length) {
        const variantClone = { ...source };

        delete variantClone.attributes;
        Object.keys(explicitAttributes).forEach((key) => {
          delete variantClone[key];
        });

        combinations.push({
          ...variantClone,
          attributes: { ...currentAttributes },
        });
        return;
      }

      const entry = attributeEntries[position];

      entry.values.forEach((value) => {
        combine(position + 1, {
          ...currentAttributes,
          [entry.key]: value,
        });
      });
    };

    combine(0, {});

    return combinations;
  }

  buildVariantSku(dynamicAttributes, variantIndex, combinationIndex = 0) {
    const baseSku =
      this.sku || this.slug || this.generateSlug(this.title) || "PROD";

    const normalizedBaseSku = baseSku
      .toString()
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    const attributeParts = Object.values(dynamicAttributes)
      .map((value) => {
        let stringValue = "";
        
        if (Array.isArray(value)) {
          // Si el valor es un array, convertir a string separado por guiones
          stringValue = value
            .map((item) => 
              (item || "")
                .toString()
                .toUpperCase()
                .replace(/[^A-Z0-9]+/g, "-")
                .replace(/^-+|-+$/g, "")
            )
            .filter(Boolean)
            .join("-");
        } else {
          // Si es un valor simple
          stringValue = (value || "")
            .toString()
            .toUpperCase()
            .replace(/[^A-Z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "");
        }
        
        return stringValue;
      })
      .filter(Boolean);

    if (attributeParts.length === 0) {
      attributeParts.push(`VAR${variantIndex + 1}-${combinationIndex + 1}`);
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
