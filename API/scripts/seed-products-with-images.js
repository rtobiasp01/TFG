/* eslint-disable no-console */
const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');

require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const connectDB = require('../db/mongo');
const Product = require('../models/products');
const Category = require('../models/categories');

const UPLOADS_DIR = path.resolve(__dirname, '..', 'uploads');
const DOWNLOAD_CACHE = new Map();
const DOWNLOAD_TIMEOUT_MS = 15000;
const DOWNLOAD_RETRIES = 3;

const CATEGORY_SEEDS = [
  {
    name: 'Decoracion en madera grabada',
    description: 'Piezas decorativas de madera con grabado laser listas para regalar o decorar.',
    visible: true,
  },
  {
    name: 'Personalizables con foto o texto',
    description: 'Productos de madera donde puedes grabar tu foto, tu texto o ambas opciones.',
    visible: true,
  },
  {
    name: 'Placas y senaletica',
    description: 'Carteles y placas de madera grabadas para hogar, eventos y negocios.',
    visible: true,
  },
  {
    name: 'Piezas para maquetas',
    description: 'Sets de piezas de madera cortadas y grabadas para maquetas y hobby.',
    visible: true,
  },
  {
    name: 'Hogar y cocina',
    description: 'Accesorios de madera grabada para uso diario en casa y cocina.',
    visible: true,
  },
  {
    name: 'Seleccion por tipo de madera',
    description: 'Productos configurables donde eliges tipo de madera y acabado.',
    visible: true,
  },
];

const PRODUCT_SEEDS = [
  {
    title: 'Placa de bienvenida ya grabada',
    description:
      'Placa de madera de roble con diseno floral y mensaje de bienvenida ya grabado con laser. Producto terminado, listo para colgar.',
    short_description: 'Placa ya grabada en roble, lista para usar.',
    price: 39.9,
    sale_price: 34.9,
    sku: 'SEED-MADERA-GRABADA-001',
    stock_status: 'in_stock',
    stock_quantity: 28,
    manage_stock: true,
    type: 'simple',
    physical_attributes: {
      length: 30,
      width: 17,
      height: 0.8,
      weight: 0.42,
      material: 'roble',
    },
    average_rating: 4.8,
    categoria: ['Decoracion en madera grabada', 'Placas y senaletica'],
    custom_slug: 'placa-bienvenida-ya-grabada-roble',
    imageUrl: 'https://picsum.photos/seed/placa-bienvenida-grabada-main/1200/900.jpg',
    galleryUrls: [
      'https://picsum.photos/seed/placa-bienvenida-grabada-gallery-1/1200/900.jpg',
      'https://picsum.photos/seed/placa-bienvenida-grabada-gallery-2/1200/900.jpg',
      'https://picsum.photos/seed/placa-bienvenida-grabada-gallery-3/1200/900.jpg',
    ],
    visible: true,
  },
  {
    title: 'Caja de recuerdos con grabado fijo',
    description:
      'Caja de madera de haya con patron grabado laser en la tapa. No requiere personalizacion y llega completamente terminada.',
    short_description: 'Caja ya grabada, ideal para regalo.',
    price: 26.9,
    sale_price: 22.9,
    sku: 'SEED-MADERA-GRABADA-002',
    stock_status: 'in_stock',
    stock_quantity: 36,
    manage_stock: true,
    type: 'simple',
    physical_attributes: {
      length: 21,
      width: 15,
      height: 7,
      weight: 0.39,
      material: 'haya',
    },
    average_rating: 4.7,
    categoria: ['Decoracion en madera grabada', 'Hogar y cocina'],
    custom_slug: 'caja-recuerdos-grabado-fijo-haya',
    imageUrl: 'https://picsum.photos/seed/caja-grabada-fija-main/1200/900.jpg',
    galleryUrls: [
      'https://picsum.photos/seed/caja-grabada-fija-gallery-1/1200/900.jpg',
      'https://picsum.photos/seed/caja-grabada-fija-gallery-2/1200/900.jpg',
    ],
    visible: true,
  },
  {
    title: 'Cartel de puerta por tipo de madera',
    description:
      'Cartel grabado con texto estandar donde puedes elegir tipo de madera, tamano y acabado antes de comprar.',
    short_description: 'Selecciona madera y acabado para tu cartel.',
    price: 44,
    sale_price: 39,
    sku: 'SEED-MADERA-VARIABLE-003',
    stock_status: 'in_stock',
    stock_quantity: 0,
    manage_stock: true,
    type: 'variable',
    physical_attributes: {
      length: 35,
      width: 18,
      height: 1.2,
      weight: 0.56,
      material: 'madera seleccionable',
    },
    variantes: [
      {
        tipo_madera: 'pino',
        talla: 'S',
        acabado: 'mate',
        stock_quantity: 18,
        precio_adicional: 0,
        imageUrls: [
          'https://picsum.photos/seed/cartel-madera-pino-v1/1200/900.jpg',
          'https://picsum.photos/seed/cartel-madera-pino-v1b/1200/900.jpg',
        ],
      },
      {
        tipo_madera: 'haya',
        talla: 'M',
        acabado: 'satinado',
        stock_quantity: 12,
        precio_adicional: 5,
        imageUrls: [
          'https://picsum.photos/seed/cartel-madera-haya-v2/1200/900.jpg',
          'https://picsum.photos/seed/cartel-madera-haya-v2b/1200/900.jpg',
        ],
      },
      {
        tipo_madera: 'nogal',
        talla: 'L',
        acabado: 'brillo',
        stock_quantity: 7,
        precio_adicional: 11,
        imageUrls: [
          'https://picsum.photos/seed/cartel-madera-nogal-v3/1200/900.jpg',
          'https://picsum.photos/seed/cartel-madera-nogal-v3b/1200/900.jpg',
        ],
      },
    ],
    average_rating: 4.9,
    categoria: ['Placas y senaletica', 'Seleccion por tipo de madera'],
    custom_slug: 'cartel-puerta-por-tipo-de-madera',
    imageUrl: 'https://picsum.photos/seed/cartel-puerta-madera-main/1200/900.jpg',
    galleryUrls: [
      'https://picsum.photos/seed/cartel-puerta-madera-gallery-1/1200/900.jpg',
      'https://picsum.photos/seed/cartel-puerta-madera-gallery-2/1200/900.jpg',
    ],
    visible: true,
  },
  {
    title: 'Set de piezas para maqueta con maderas',
    description:
      'Set de piezas de madera cortadas y grabadas para maqueta. Puedes elegir tipo de madera y escala del conjunto.',
    short_description: 'Piezas de maqueta con eleccion de madera.',
    price: 63,
    sale_price: 57,
    sku: 'SEED-MADERA-VARIABLE-004',
    stock_status: 'in_stock',
    stock_quantity: 0,
    manage_stock: true,
    type: 'variable',
    physical_attributes: {
      length: 38,
      width: 26,
      height: 5,
      weight: 1.05,
      material: 'madera seleccionable',
    },
    variantes: [
      {
        escala: '1:87',
        tipo_madera: 'mdf',
        stock_quantity: 10,
        precio_adicional: 0,
        imageUrls: ['https://picsum.photos/seed/maqueta-mdf-v1/1200/900.jpg'],
      },
      {
        escala: '1:72',
        tipo_madera: 'abedul',
        stock_quantity: 6,
        precio_adicional: 9,
        imageUrls: ['https://picsum.photos/seed/maqueta-abedul-v2/1200/900.jpg'],
      },
      {
        escala: '1:48',
        tipo_madera: 'nogal',
        stock_quantity: 3,
        precio_adicional: 16,
        imageUrls: ['https://picsum.photos/seed/maqueta-nogal-v3/1200/900.jpg'],
      },
    ],
    average_rating: 4.7,
    categoria: ['Piezas para maquetas', 'Seleccion por tipo de madera'],
    custom_slug: 'set-maqueta-madera-grabada-laser',
    imageUrl: 'https://picsum.photos/seed/maqueta-madera-main/1200/900.jpg',
    galleryUrls: [
      'https://picsum.photos/seed/maqueta-madera-gallery-1/1200/900.jpg',
      'https://picsum.photos/seed/maqueta-madera-gallery-2/1200/900.jpg',
    ],
    visible: true,
  },
  {
    title: 'Marco de foto personalizado con imagen',
    description:
      'Marco de madera grabado con laser pensado para subir una foto que se integra en el diseno. Personalizacion enfocada en imagen.',
    short_description: 'Sube tu foto para grabarla en el marco.',
    price: 37,
    sale_price: 32,
    sku: 'SEED-CUSTOM-FOTO-005',
    stock_status: 'in_stock',
    stock_quantity: 22,
    manage_stock: true,
    type: 'custom-personalized',
    physical_attributes: {
      length: 29,
      width: 24,
      height: 1.2,
      weight: 0.52,
      material: 'abedul',
    },
    customization_config: {
      allowImage: true,
      enableBackgroundRemoval: true,
      allowText: false,
      maxImageSize: 5242880,
      maxTextLength: 0,
      imageFormats: ['jpg', 'jpeg', 'png', 'webp'],
      textPlaceholder: '',
      imagePlacement: {
        xPercent: 50,
        yPercent: 50,
        widthPercent: 62,
        heightPercent: 62,
      },
      textPlacement: {
        xPercent: 50,
        yPercent: 88,
        widthPercent: 70,
        heightPercent: 10,
      },
    },
    average_rating: 4.9,
    categoria: ['Personalizables con foto o texto'],
    custom_slug: 'marco-foto-personalizado-imagen',
    imageUrl: 'https://picsum.photos/seed/marco-foto-personalizado-main/1200/900.jpg',
    galleryUrls: [
      'https://picsum.photos/seed/marco-foto-personalizado-gallery-1/1200/900.jpg',
      'https://picsum.photos/seed/marco-foto-personalizado-gallery-2/1200/900.jpg',
    ],
    visible: true,
  },
  {
    title: 'Tabla de cocina personalizada con texto',
    description:
      'Tabla de cocina de madera para grabado laser de nombres o frases. Personalizacion enfocada en texto.',
    short_description: 'Personaliza tu tabla con texto grabado.',
    price: 33,
    sale_price: 28.9,
    sku: 'SEED-CUSTOM-TEXTO-006',
    stock_status: 'in_stock',
    stock_quantity: 30,
    manage_stock: true,
    type: 'custom-personalized',
    physical_attributes: {
      length: 34,
      width: 22,
      height: 1.5,
      weight: 0.64,
      material: 'bambu',
    },
    customization_config: {
      allowImage: false,
      enableBackgroundRemoval: false,
      allowText: true,
      maxImageSize: 5242880,
      maxTextLength: 90,
      imageFormats: ['png'],
      textPlaceholder: 'Escribe el texto que quieres grabar',
      imagePlacement: {
        xPercent: 50,
        yPercent: 45,
        widthPercent: 45,
        heightPercent: 45,
      },
      textPlacement: {
        xPercent: 50,
        yPercent: 58,
        widthPercent: 78,
        heightPercent: 26,
      },
    },
    average_rating: 4.8,
    categoria: ['Personalizables con foto o texto', 'Hogar y cocina'],
    custom_slug: 'tabla-cocina-personalizada-texto',
    imageUrl: 'https://picsum.photos/seed/tabla-cocina-texto-main/1200/900.jpg',
    galleryUrls: [
      'https://picsum.photos/seed/tabla-cocina-texto-gallery-1/1200/900.jpg',
      'https://picsum.photos/seed/tabla-cocina-texto-gallery-2/1200/900.jpg',
    ],
    visible: true,
  },
  {
    title: 'Llavero doble personalizado foto y texto',
    description:
      'Llavero de madera grabado con laser que permite personalizar con foto y ademas una frase corta. Personalizacion completa.',
    short_description: 'Personaliza con foto y texto en un mismo producto.',
    price: 19.9,
    sale_price: 16.9,
    sku: 'SEED-CUSTOM-FOTO-TEXTO-007',
    stock_status: 'in_stock',
    stock_quantity: 55,
    manage_stock: true,
    type: 'custom-personalized',
    physical_attributes: {
      length: 8,
      width: 4,
      height: 0.6,
      weight: 0.04,
      material: 'nogal',
    },
    customization_config: {
      allowImage: true,
      enableBackgroundRemoval: true,
      allowText: true,
      maxImageSize: 4194304,
      maxTextLength: 45,
      imageFormats: ['jpg', 'jpeg', 'png', 'webp'],
      textPlaceholder: 'Iniciales, fecha o frase corta',
      imagePlacement: {
        xPercent: 50,
        yPercent: 42,
        widthPercent: 54,
        heightPercent: 50,
      },
      textPlacement: {
        xPercent: 50,
        yPercent: 82,
        widthPercent: 78,
        heightPercent: 16,
      },
    },
    average_rating: 5,
    categoria: ['Personalizables con foto o texto'],
    custom_slug: 'llavero-doble-personalizado-foto-texto',
    imageUrl: 'https://picsum.photos/seed/llavero-foto-texto-main/1200/900.jpg',
    galleryUrls: [
      'https://picsum.photos/seed/llavero-foto-texto-gallery-1/1200/900.jpg',
      'https://picsum.photos/seed/llavero-foto-texto-gallery-2/1200/900.jpg',
      'https://picsum.photos/seed/llavero-foto-texto-gallery-3/1200/900.jpg',
    ],
    visible: true,
  },
];

function sanitizeFileName(input) {
  return String(input)
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
}

function extensionFromContentType(contentType) {
  const normalized = String(contentType || '').toLowerCase();
  if (normalized.includes('image/jpeg')) return '.jpg';
  if (normalized.includes('image/png')) return '.png';
  if (normalized.includes('image/webp')) return '.webp';
  if (normalized.includes('image/gif')) return '.gif';
  return '';
}

function extensionFromUrl(url) {
  try {
    const pathname = new URL(url).pathname;
    const extension = path.extname(pathname);
    if (!extension) return '';
    if (extension.length > 5) return '';
    return extension.toLowerCase();
  } catch (_) {
    return '';
  }
}

async function ensureUploadsDir() {
  await fs.mkdir(UPLOADS_DIR, { recursive: true });
}

async function fetchWithTimeout(url, timeoutMs) {
  const abortController = new AbortController();
  const timeoutId = setTimeout(() => abortController.abort(), timeoutMs);

  try {
    return await fetch(url, { signal: abortController.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}

async function downloadImageToUploads(url, fileBaseName) {
  if (DOWNLOAD_CACHE.has(url)) {
    return DOWNLOAD_CACHE.get(url);
  }

  let response = null;
  let lastError = null;

  for (let attempt = 1; attempt <= DOWNLOAD_RETRIES; attempt += 1) {
    try {
      response = await fetchWithTimeout(url, DOWNLOAD_TIMEOUT_MS);
      if (response.ok) {
        break;
      }

      lastError = new Error(`HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
    }
  }

  if (!response || !response.ok) {
    const reason = lastError ? lastError.message : 'sin detalle';
    throw new Error(`No se pudo descargar imagen desde ${url}. Motivo: ${reason}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  const extByContentType = extensionFromContentType(response.headers.get('content-type'));
  const extByUrl = extensionFromUrl(response.url || url);
  const extension = extByContentType || extByUrl || '.jpg';

  const safeBaseName = sanitizeFileName(fileBaseName);
  const randomSuffix = crypto.randomBytes(4).toString('hex');
  const fileName = `${safeBaseName}-${Date.now()}-${randomSuffix}${extension}`;
  const fullPath = path.join(UPLOADS_DIR, fileName);

  await fs.writeFile(fullPath, buffer);
  const publicPath = `/uploads/${fileName}`;
  DOWNLOAD_CACHE.set(url, publicPath);
  return publicPath;
}

async function materializeSeed(seed) {
  const image = await downloadImageToUploads(seed.imageUrl, `${seed.sku}-main`);

  const gallery = [];
  for (let i = 0; i < (seed.galleryUrls || []).length; i += 1) {
    const galleryPath = await downloadImageToUploads(
      seed.galleryUrls[i],
      `${seed.sku}-gallery-${i + 1}`,
    );
    gallery.push(galleryPath);
  }

  const variantes = [];
  for (let i = 0; i < (seed.variantes || []).length; i += 1) {
    const variant = seed.variantes[i];
    const imageUrls = Array.isArray(variant.imageUrls) ? variant.imageUrls : [];
    const imagenes = [];

    for (let j = 0; j < imageUrls.length; j += 1) {
      const variantImagePath = await downloadImageToUploads(
        imageUrls[j],
        `${seed.sku}-variant-${i + 1}-${j + 1}`,
      );
      imagenes.push(variantImagePath);
    }

    const { imageUrls: _ignoreImageUrls, ...variantRest } = variant;
    variantes.push({
      ...variantRest,
      imagenes,
    });
  }

  const {
    imageUrl: _ignoreImageUrl,
    galleryUrls: _ignoreGalleryUrls,
    ...seedWithoutRemoteAssets
  } = seed;

  return {
    ...seedWithoutRemoteAssets,
    image,
    gallery,
    variantes,
  };
}

async function upsertCategories(db) {
  const categoriesCollection = db.collection('categories');
  const existing = await categoriesCollection.find({}).toArray();
  const existingByName = new Map(existing.map((category) => [category.name, category]));

  let created = 0;
  let updated = 0;

  for (const seed of CATEGORY_SEEDS) {
    const normalizedCategory = new Category(seed);
    const match = existingByName.get(normalizedCategory.name);

    if (!match) {
      await categoriesCollection.insertOne(normalizedCategory);
      created += 1;
      console.log(`Creada categoria ${normalizedCategory.name}`);
      continue;
    }

    await categoriesCollection.updateOne(
      { _id: match._id },
      {
        $set: {
          description: normalizedCategory.description,
          visible: normalizedCategory.visible,
        },
      },
    );

    updated += 1;
    console.log(`Actualizada categoria ${normalizedCategory.name}`);
  }

  console.log(`Categorias: creadas ${created}, actualizadas ${updated}`);
}

async function upsertProductsWithImages(db) {
  await ensureUploadsDir();
  const collection = db.collection('products');

  let created = 0;
  let updated = 0;

  for (const seed of PRODUCT_SEEDS) {
    const materializedSeed = await materializeSeed(seed);
    const normalizedProduct = new Product(materializedSeed);
    const existing = await collection.findOne({ sku: normalizedProduct.sku });

    if (!existing) {
      await collection.insertOne(normalizedProduct);
      created += 1;
      console.log(`Creado producto ${normalizedProduct.sku}`);
      continue;
    }

    await collection.updateOne(
      { _id: existing._id },
      {
        $set: normalizedProduct,
      },
    );

    updated += 1;
    console.log(`Actualizado producto ${normalizedProduct.sku}`);
  }

  console.log(`Productos: creados ${created}, actualizados ${updated}`);
}

async function run() {
  const db = await connectDB();
  await upsertCategories(db);
  await upsertProductsWithImages(db);
  console.log('Seed completado correctamente.');
}

run()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error ejecutando seed de productos con imagenes:', error);
    process.exit(1);
  });
