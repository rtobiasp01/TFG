/* eslint-disable no-console */
const BASE_URL = process.env.API_BASE_URL || "http://localhost:3000";

const USER_PASSWORD = "Laser1234!";

const USERS = [
  { email: "admin.madera@demo.com", password: USER_PASSWORD, isAdmin: true },
  { email: "cliente.madera@demo.com", password: USER_PASSWORD, isAdmin: false },
  { email: "taller.laser@demo.com", password: USER_PASSWORD, isAdmin: false },
];

const CATEGORY_SEEDS = [
  {
    name: "Decoracion laser",
    description: "Piezas decorativas en madera natural con grabado laser de alta precision.",
    visible: true,
  },
  {
    name: "Regalos personalizados",
    description: "Detalles unicos en madera grabada para celebraciones y eventos especiales.",
    visible: true,
  },
  {
    name: "Senaletica en madera",
    description: "Carteles y placas de madera grabada para hogar, oficina y comercios.",
    visible: true,
  },
  {
    name: "Modelismo y maquetas",
    description: "Piezas cortadas y grabadas para maquetas, dioramas y proyectos creativos.",
    visible: true,
  },
];

const PRODUCT_SEEDS = [
  {
    title: "Placa Bienvenida Roble",
    description:
      "Placa de bienvenida en madera de roble con grabado laser profundo y acabado al aceite natural.",
    short_description: "Placa de roble grabada para entrada.",
    price: 39.9,
    sale_price: 34.9,
    sku: "WOOD-PLACA-ROBLE-001",
    stock_status: "in_stock",
    stock_quantity: 24,
    manage_stock: true,
    type: "simple",
    physical_attributes: {
      length: 30,
      width: 18,
      height: 0.8,
      weight: 0.45,
      material: "roble",
    },
    average_rating: 4.9,
    categoria: ["Decoracion laser", "Senaletica en madera"],
    custom_slug: "placa-bienvenida-roble-grabada",
    image: "/uploads/1775032806491.jpg",
    gallery: [
      "/uploads/1775032806491.jpg",
      "/uploads/1775033017159.jpg",
      "/uploads/1776006623846.JPG",
    ],
    visible: true,
  },
  {
    title: "Caja Recuerdo Grabada",
    description:
      "Caja de madera de haya con tapa grabada a laser, ideal para guardar recuerdos y joyeria.",
    short_description: "Caja de haya personalizada con grabado.",
    price: 27.5,
    sale_price: null,
    sku: "WOOD-CAJA-HAYA-002",
    stock_status: "in_stock",
    stock_quantity: 40,
    manage_stock: true,
    type: "simple",
    physical_attributes: {
      length: 20,
      width: 14,
      height: 8,
      weight: 0.35,
      material: "haya",
    },
    average_rating: 4.7,
    categoria: ["Regalos personalizados"],
    custom_slug: "caja-recuerdo-grabada-haya",
    image: "/uploads/1775032806546.jpg",
    gallery: [
      "/uploads/1775032806546.jpg",
      "/uploads/1775033017214.jpg",
      "/uploads/1776590836239.png",
    ],
    visible: true,
  },
  {
    title: "Letrero Taller Artesano",
    description:
      "Letrero de pino barnizado con grabado laser de alta definicion para talleres y estudios creativos.",
    short_description: "Letrero de pino grabado para negocio.",
    price: 54,
    sale_price: 49,
    sku: "WOOD-LETRERO-PINO-003",
    stock_status: "in_stock",
    stock_quantity: 12,
    manage_stock: true,
    type: "simple",
    physical_attributes: {
      length: 45,
      width: 20,
      height: 1,
      weight: 0.7,
      material: "pino",
    },
    average_rating: 4.8,
    categoria: ["Senaletica en madera", "Decoracion laser"],
    custom_slug: "letrero-taller-artesano-grabado",
    image: "/uploads/1775032806650.jpg",
    gallery: [
      "/uploads/1775032806650.jpg",
      "/uploads/1775033017266.jpg",
      "/uploads/1776272385178.webp",
    ],
    visible: true,
  },
  {
    title: "Pack Maqueta Ferrocarril",
    description:
      "Kit de piezas en contrachapado cortadas y grabadas a laser para maqueta de estacion ferroviaria.",
    short_description: "Pack de madera grabada para modelismo.",
    price: 64,
    sale_price: 59,
    sku: "WOOD-MAQUETA-KIT-004",
    stock_status: "in_stock",
    stock_quantity: 18,
    manage_stock: true,
    type: "variable",
    physical_attributes: {
      length: 35,
      width: 25,
      height: 4,
      weight: 0.9,
      material: "contrachapado",
    },
    variantes: [
      {
        escala: ["1:87", "1:72"],
        acabado: ["natural", "nogal"],
        stock_quantity: 8,
        precio_adicional: 0,
        imagenes: ["/uploads/1776536161330.png"],
      },
      {
        escala: "1:48",
        acabado: "nogal",
        stock_quantity: 4,
        precio_adicional: 9,
        imagenes: ["/uploads/1776590854696.png"],
      },
    ],
    customization_config: {
      allowImage: false,
      enableBackgroundRemoval: false,
      allowText: true,
      maxTextLength: 60,
      imageFormats: ["png"],
      textPlaceholder: "Texto para placa del andén",
      textPlacement: {
        xPercent: 50,
        yPercent: 82,
        widthPercent: 60,
        heightPercent: 12,
      },
    },
    average_rating: 4.6,
    categoria: ["Modelismo y maquetas", "Regalos personalizados"],
    custom_slug: "pack-maqueta-ferrocarril-laser",
    image: "/uploads/1776536161330.png",
    gallery: [
      "/uploads/1776536161330.png",
      "/uploads/1776590854696.png",
      "/uploads/1776590836239.png",
    ],
    visible: true,
  },
  {
    title: "Tabla Cocina Grabada",
    description:
      "Tabla de cocina de bambú con grabado laser de receta o nombre familiar, resistente y decorativa.",
    short_description: "Tabla personalizada de bambú.",
    price: 31,
    sale_price: 28,
    sku: "WOOD-TABLA-BAMBU-005",
    stock_status: "in_stock",
    stock_quantity: 30,
    manage_stock: true,
    type: "custom-personalized",
    physical_attributes: {
      length: 34,
      width: 22,
      height: 1.5,
      weight: 0.62,
      material: "bambu",
    },
    customization_config: {
      allowImage: true,
      enableBackgroundRemoval: true,
      allowText: true,
      maxImageSize: 5242880,
      maxTextLength: 120,
      imageFormats: ["jpg", "jpeg", "png", "webp"],
      textPlaceholder: "Escribe tu apellido o frase",
      imagePlacement: {
        xPercent: 48,
        yPercent: 42,
        widthPercent: 52,
        heightPercent: 50,
      },
      textPlacement: {
        xPercent: 50,
        yPercent: 84,
        widthPercent: 70,
        heightPercent: 14,
      },
    },
    average_rating: 4.9,
    categoria: ["Regalos personalizados", "Decoracion laser"],
    custom_slug: "tabla-cocina-bambu-grabada",
    image: "/uploads/1776006623846.JPG",
    gallery: [
      "/uploads/1776006623846.JPG",
      "/uploads/1776272385178.webp",
      "/uploads/1775033017159.jpg",
    ],
    visible: true,
  },
];

function buildUrl(pathname) {
  return `${BASE_URL}${pathname}`;
}

async function api(pathname, options = {}) {
  const response = await fetch(buildUrl(pathname), {
    headers: {
      "Content-Type": "application/json",
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      ...(options.headers || {}),
    },
    method: options.method || "GET",
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const text = await response.text();
  let payload = null;

  if (text) {
    try {
      payload = JSON.parse(text);
    } catch (_) {
      payload = { raw: text };
    }
  }

  return {
    ok: response.ok,
    status: response.status,
    payload,
  };
}

async function registerAndLogin(email, password, isAdmin) {
  const registerResult = await api("/users/register", {
    method: "POST",
    body: { email, password, isAdmin },
  });

  if (!registerResult.ok && registerResult.status !== 400) {
    throw new Error(
      `No se pudo registrar ${email}. Status: ${registerResult.status}. Respuesta: ${JSON.stringify(
        registerResult.payload,
      )}`,
    );
  }

  const loginResult = await api("/users/login", {
    method: "POST",
    body: { email, password },
  });

  if (!loginResult.ok || !loginResult.payload?.token) {
    throw new Error(
      `No se pudo hacer login con ${email}. Status: ${loginResult.status}. Respuesta: ${JSON.stringify(
        loginResult.payload,
      )}`,
    );
  }

  return {
    email,
    token: loginResult.payload.token,
    user: loginResult.payload.user,
  };
}

async function ensureCategories() {
  const existingRes = await api("/categories");
  if (!existingRes.ok) {
    throw new Error(`No se pudieron leer categorias: ${existingRes.status}`);
  }

  const existing = Array.isArray(existingRes.payload) ? existingRes.payload : [];
  const existingByName = new Map(existing.map((cat) => [cat.name, cat]));

  for (const category of CATEGORY_SEEDS) {
    if (existingByName.has(category.name)) {
      continue;
    }

    const createRes = await api("/categories", {
      method: "POST",
      body: category,
    });

    if (!createRes.ok) {
      throw new Error(
        `No se pudo crear categoria ${category.name}. Status: ${createRes.status}. Respuesta: ${JSON.stringify(
          createRes.payload,
        )}`,
      );
    }
  }
}

async function ensureProducts() {
  const existingRes = await api("/products");
  if (!existingRes.ok) {
    throw new Error(`No se pudieron leer productos: ${existingRes.status}`);
  }

  const existing = Array.isArray(existingRes.payload) ? existingRes.payload : [];
  const existingBySku = new Map(existing.map((product) => [product.sku, product]));

  for (const product of PRODUCT_SEEDS) {
    const match = existingBySku.get(product.sku);

    if (!match) {
      const createRes = await api("/products", {
        method: "POST",
        body: product,
      });

      if (!createRes.ok) {
        throw new Error(
          `No se pudo crear producto ${product.sku}. Status: ${createRes.status}. Respuesta: ${JSON.stringify(
            createRes.payload,
          )}`,
        );
      }
      continue;
    }

    const updateRes = await api(`/products/${match._id}`, {
      method: "PUT",
      body: {
        ...product,
      },
    });

    if (!updateRes.ok) {
      throw new Error(
        `No se pudo actualizar producto ${product.sku}. Status: ${updateRes.status}. Respuesta: ${JSON.stringify(
          updateRes.payload,
        )}`,
      );
    }
  }
}

async function seedCartAndOrders(customerAuth) {
  const productsRes = await api("/products");
  if (!productsRes.ok) {
    throw new Error(`No se pudieron recuperar productos para carrito/pedido: ${productsRes.status}`);
  }

  const products = Array.isArray(productsRes.payload) ? productsRes.payload : [];
  const simpleProduct = products.find((p) => p.sku === "WOOD-CAJA-HAYA-002");
  const variableProduct = products.find((p) => p.sku === "WOOD-MAQUETA-KIT-004");
  const customProduct = products.find((p) => p.sku === "WOOD-TABLA-BAMBU-005");

  if (!simpleProduct || !variableProduct || !customProduct) {
    throw new Error("No se encontraron productos necesarios para carrito/pedidos.");
  }

  const selectedVariant = Array.isArray(variableProduct.variantes) ? variableProduct.variantes[0] : null;
  if (!selectedVariant?.sku) {
    throw new Error("Producto variable sin variantes disponibles para pruebas de stock.");
  }

  const validateStockRes = await api("/products/validate-stock", {
    method: "POST",
    body: {
      product_sku: variableProduct.sku,
      variant_sku: selectedVariant.sku,
      quantity: 2,
    },
  });

  if (!validateStockRes.ok) {
    throw new Error(`Fallo validate-stock: ${validateStockRes.status}`);
  }

  const validateCustomizationRes = await api("/products/validate-customization", {
    method: "POST",
    body: {
      product_sku: customProduct.sku,
      customization: {
        customText: "Familia Cerezo",
        uploadedImageUrl: "/uploads/1776272385178.webp",
      },
    },
  });

  if (!validateCustomizationRes.ok) {
    throw new Error(`Fallo validate-customization: ${validateCustomizationRes.status}`);
  }

  const decrementStockRes = await api("/products/decrement-stock", {
    method: "POST",
    body: {
      product_sku: variableProduct.sku,
      variant_sku: selectedVariant.sku,
      quantity: 1,
    },
  });

  if (!decrementStockRes.ok) {
    throw new Error(`Fallo decrement-stock: ${decrementStockRes.status}`);
  }

  const cartItems = [
    {
      productId: simpleProduct._id,
      productTitle: simpleProduct.title,
      quantity: 2,
      price: simpleProduct.price,
      basePrice: simpleProduct.price,
      variantAdditionalPrice: 0,
      simpleSku: simpleProduct.sku,
      image: simpleProduct.image,
      customization: {},
    },
    {
      productId: variableProduct._id,
      productTitle: variableProduct.title,
      quantity: 1,
      price: Number(variableProduct.price) + Number(selectedVariant.precio_adicional || 0),
      basePrice: variableProduct.price,
      variantAdditionalPrice: selectedVariant.precio_adicional || 0,
      variantSku: selectedVariant.sku,
      simpleSku: variableProduct.sku,
      image: (Array.isArray(selectedVariant.imagenes) && selectedVariant.imagenes[0]) || variableProduct.image,
      selection: selectedVariant.attributes || {},
      customization: {
        customText: "Escena principal",
      },
    },
    {
      productId: customProduct._id,
      productTitle: customProduct.title,
      quantity: 1,
      price: customProduct.price,
      basePrice: customProduct.price,
      variantAdditionalPrice: 0,
      simpleSku: customProduct.sku,
      image: customProduct.image,
      customization: {
        customText: "Casa de la Familia Cerezo",
        uploadedImageUrl: "/uploads/1776536161330.png",
      },
    },
  ];

  const saveCartRes = await api("/cart/me", {
    method: "PUT",
    token: customerAuth.token,
    body: {
      items: cartItems,
      lastUpdated: Date.now(),
    },
  });

  if (!saveCartRes.ok) {
    throw new Error(`No se pudo guardar carrito autenticado: ${saveCartRes.status}`);
  }

  const shippingAddress = {
    fullName: "Lucia Cerezo",
    phone: "+34 600 111 222",
    line1: "Calle de la Madera 12",
    city: "Valencia",
    postalCode: "46001",
    province: "Valencia",
    country: "ES",
    notes: "Entregar en horario de tarde",
  };

  const checkoutRes = await api("/orders/checkout", {
    method: "POST",
    token: customerAuth.token,
    body: { shippingAddress },
  });

  if (!checkoutRes.ok || !checkoutRes.payload?._id) {
    throw new Error(
      `No se pudo crear el pedido desde checkout. Status: ${checkoutRes.status}. Respuesta: ${JSON.stringify(
        checkoutRes.payload,
      )}`,
    );
  }

  const orderId = checkoutRes.payload._id;

  const orderByIdRes = await api(`/orders/${orderId}`);
  if (!orderByIdRes.ok) {
    throw new Error(`No se pudo consultar pedido por id: ${orderByIdRes.status}`);
  }

  const customerOrdersRes = await api("/orders/me", {
    token: customerAuth.token,
  });
  if (!customerOrdersRes.ok) {
    throw new Error(`No se pudieron consultar pedidos del usuario: ${customerOrdersRes.status}`);
  }

  const allOrdersRes = await api("/orders", {
    token: customerAuth.token,
  });
  if (!allOrdersRes.ok) {
    throw new Error(`No se pudieron consultar todos los pedidos: ${allOrdersRes.status}`);
  }

  const updateStatusRes = await api(`/orders/${orderId}/status`, {
    method: "PUT",
    token: customerAuth.token,
    body: {
      status: "confirmado",
    },
  });

  if (!updateStatusRes.ok) {
    throw new Error(`No se pudo actualizar estado de pedido: ${updateStatusRes.status}`);
  }

  return { orderId };
}

async function exerciseLegacyCartEndpoint(customerId, productId, productPrice) {
  const addRes = await api(`/cart/${customerId}/items`, {
    method: "POST",
    body: {
      productId,
      quantity: 1,
      price: productPrice,
    },
  });

  if (!addRes.ok) {
    throw new Error(`No se pudo usar endpoint cart/:userId/items: ${addRes.status}`);
  }

  const updateRes = await api(`/cart/${customerId}/items/${productId}`, {
    method: "PUT",
    body: {
      quantity: 3,
      price: productPrice,
    },
  });

  if (!updateRes.ok) {
    throw new Error(`No se pudo usar endpoint cart/:userId/items/:productId: ${updateRes.status}`);
  }

  const getRes = await api(`/cart/${customerId}`);
  if (!getRes.ok) {
    throw new Error(`No se pudo consultar cart/:userId: ${getRes.status}`);
  }

  const clearRes = await api(`/cart/${customerId}/items`, {
    method: "DELETE",
  });

  if (!clearRes.ok) {
    throw new Error(`No se pudo limpiar cart/:userId/items: ${clearRes.status}`);
  }
}

async function main() {
  console.log("Iniciando carga de datos de prueba (madera grabada laser)...");
  console.log(`API destino: ${BASE_URL}`);

  const uploadedFilesRes = await api("/upload");
  if (!uploadedFilesRes.ok) {
    throw new Error(
      `No se pudo consultar /upload para validar imagenes existentes. Status: ${uploadedFilesRes.status}`,
    );
  }

  const uploadedFiles = uploadedFilesRes.payload?.files || [];
  if (!Array.isArray(uploadedFiles) || uploadedFiles.length === 0) {
    throw new Error("No hay imagenes en /uploads. Sube al menos una imagen antes de ejecutar el seed.");
  }

  for (const requiredImage of [
    "1775032806491.jpg",
    "1775032806546.jpg",
    "1775032806650.jpg",
    "1775033017159.jpg",
    "1775033017214.jpg",
    "1775033017266.jpg",
    "1776006623846.JPG",
    "1776272385178.webp",
    "1776536161330.png",
    "1776590836239.png",
    "1776590854696.png",
  ]) {
    if (!uploadedFiles.includes(requiredImage)) {
      console.warn(`Aviso: falta imagen ${requiredImage} en uploads, pero el seed continuara.`);
    }
  }

  const authByEmail = {};

  for (const user of USERS) {
    authByEmail[user.email] = await registerAndLogin(user.email, user.password, user.isAdmin);
  }

  await ensureCategories();
  await ensureProducts();

  const customerAuth = authByEmail["cliente.madera@demo.com"];
  const adminAuth = authByEmail["admin.madera@demo.com"];

  const profileRes = await api("/users/profile", { token: customerAuth.token });
  if (!profileRes.ok) {
    throw new Error(`No se pudo consultar /users/profile: ${profileRes.status}`);
  }

  const meRes = await api("/users/me", { token: customerAuth.token });
  if (!meRes.ok) {
    throw new Error(`No se pudo consultar /users/me: ${meRes.status}`);
  }

  const orderInfo = await seedCartAndOrders(customerAuth);

  const productsRes = await api("/products");
  if (!productsRes.ok) {
    throw new Error(`No se pudo listar productos para cart legacy: ${productsRes.status}`);
  }

  const productForLegacy = Array.isArray(productsRes.payload)
    ? productsRes.payload.find((item) => item.sku === "WOOD-PLACA-ROBLE-001")
    : null;

  if (!productForLegacy?._id) {
    throw new Error("No se encontro producto para probar cart legacy.");
  }

  await exerciseLegacyCartEndpoint(
    customerAuth.user._id,
    productForLegacy._id,
    Number(productForLegacy.price) || 39.9,
  );

  const cartMeAfterLegacy = await api("/cart/me", {
    token: customerAuth.token,
  });

  if (!cartMeAfterLegacy.ok) {
    throw new Error(`No se pudo consultar carrito autenticado tras pruebas: ${cartMeAfterLegacy.status}`);
  }

  await api("/cart/me", {
    method: "DELETE",
    token: customerAuth.token,
  });

  console.log("Carga de datos completada correctamente.");
  console.log(`Usuario admin: ${adminAuth.email} / ${USER_PASSWORD}`);
  console.log(`Usuario cliente: ${customerAuth.email} / ${USER_PASSWORD}`);
  console.log(`Pedido generado y actualizado: ${orderInfo.orderId}`);
}

main().catch((error) => {
  console.error("Error en seed-test-data:");
  console.error(error.message || error);
  process.exit(1);
});
