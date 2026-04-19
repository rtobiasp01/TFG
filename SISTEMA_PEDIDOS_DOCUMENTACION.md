# Sistema de Pedidos - Implementación Completa

## 📋 Descripción General

He implementado un sistema completo de gestión de pedidos (órdenes) que conecta el carrito de compras con un flujo de compra completo. El sistema permite a los usuarios realizar pedidos y a los administradores gestionar todos los pedidos con cambios de estado.

---

## 🏗️ Arquitectura Implementada

### Backend (Node.js/Express)

#### 1. **Modelo de Órdenes** (`API/models/order.js`)

- Estructura de datos para almacenar pedidos
- Estados: `pendiente`, `confirmado`, `enviado`, `entregado`, `cancelado`
- Campos:
  - `user_id`: ID del usuario
  - `items`: Array de productos del carrito
  - `total`: Monto total del pedido
  - `status`: Estado actual
  - `shippingAddress`: Dirección de envío
  - `createdAt`, `updatedAt`: Timestamps

#### 2. **Servicio de Órdenes** (`API/services/order-service.js`)

- `createOrder()`: Crear nueva orden desde el carrito
- `getOrderById()`: Obtener detalles de una orden
- `getOrdersByUserId()`: Obtener todas las órdenes de un usuario
- `getAllOrders()`: Obtener todas las órdenes (admin)
- `updateOrderStatus()`: Cambiar estado de una orden
- `deleteOrder()`: Eliminar una orden

#### 3. **Rutas de Órdenes** (`API/routes/orders.js`)

- `POST /orders/checkout`: Convertir carrito en orden (requiere autenticación)
- `GET /orders/me`: Obtener mis órdenes (usuario autenticado)
- `GET /orders`: Obtener todas las órdenes (admin)
- `GET /orders/:orderId`: Obtener detalles de una orden
- `PUT /orders/:orderId/status`: Actualizar estado
- `DELETE /orders/:orderId`: Eliminar orden

#### 4. **Integración en app.js**

- Se registró la ruta `/orders` en la aplicación principal

---

### Frontend (Angular)

#### 1. **Interfaz Order** (`WEB/src/app/interfaces/order.ts`)

```typescript
interface Order {
  _id: string;
  user_id: string;
  items: OrderItem[];
  total: number;
  status: 'pendiente' | 'confirmado' | 'enviado' | 'entregado' | 'cancelado';
  shippingAddress: {...};
  createdAt: Date;
  updatedAt: Date;
}
```

#### 2. **Servicio de Órdenes** (`WEB/src/app/services/order-service.ts`)

- `checkout()`: Realiza el checkout del carrito actual
- `getUserOrders()`: Obtiene mis pedidos
- `getAllOrders()`: Obtiene todos los pedidos (admin)
- `updateOrderStatus()`: Cambia el estado de una orden
- `deleteOrder()`: Elimina una orden

#### 3. **Página Pública de Pedidos** (`WEB/src/app/public/pages/orders/`)

- **Componente** (`orders.ts`):
  - Carga automática de los pedidos del usuario
  - Manejo de estados y fechas
  - Formateo de precios
- **Template** (`orders.html`):
  - Lista expandible de pedidos
  - Detalle de artículos por orden
  - Timeline visual del estado del pedido
  - Dirección de envío
  - Información de personalización (texto custom)
- **Estilos** (`orders.css`):
  - Responsive design
  - Animaciones suaves
  - Indicadores de estado con colores
  - Timeline visual

#### 4. **Página Admin de Órdenes** (`WEB/src/app/admin/pages/orders/`)

- **Componente** (`orders.ts`):
  - Carga de todos los pedidos
  - Filtrado por estado
  - Actualización de estados
  - Eliminación de órdenes
- **Template** (`orders.html`):
  - Tabla de órdenes
  - Filtro por estado
  - Expansión de detalles
  - Botones para cambiar estado
  - Botón para eliminar
- **Estilos** (`orders.css`):
  - Tabla profesional
  - Responsive
  - Estados visuales

---

## 🔄 Flujo de Checkout

```
1. Usuario en carrito → Haz clic en "Realizar Pedido"
   ↓
2. Validación:
   - ¿Usuario autenticado? → Si no, redirigir a login
   - ¿Carrito vacío? → Mostrar alerta
   ↓
3. Llamada a OrderService.checkout()
   ↓
4. Backend:
   - Obtiene el carrito del usuario
   - Valida que no esté vacío
   - Crea documento Order en MongoDB
   - Limpia el carrito del usuario
   - Retorna la orden creada
   ↓
5. Frontend:
   - Muestra mensaje de éxito
   - Redirige a /pedidos
   - Usuario ve su nuevo pedido en el timeline
```

---

## 📱 Rutas Agregadas

### Públicas:

- `/pedidos` → Página "Mis Pedidos" (requiere autenticación)

### Admin:

- `/admin/pedidos` → Gestión de Órdenes (requiere permisos admin)

---

## 🎨 Integración UI

### 1. **Botón de Checkout en Carrito**

- Se agregó botón "Realizar Pedido" en el panel de resumen del carrito
- Deshabilitado si carrito está vacío o está procesando
- Muestra spinner durante el procesamiento

### 2. **Enlace en Navbar**

- "Mis Pedidos" aparece solo para usuarios autenticados
- Ubicado entre el carrito y la sección de login/admin

### 3. **Enlace en Sidebar Admin**

- "Pedidos" con icono 📦 en el menú principal
- Fácil acceso para gestión de órdenes

---

## 💾 Persistencia de Datos

### Base de Datos:

- **Colección**: `orders` en MongoDB
- **Documentos**: Una orden por compra
- **Indices**: Por `user_id` y `status` (para búsquedas rápidas)

### LocalStorage (No usado para órdenes):

- Las órdenes se persisten en la BD
- El carrito se limpia después de checkout

---

## 🔒 Seguridad

### Autenticación:

- Checkout requiere token JWT válido
- Usuario solo ve sus propias órdenes
- Admin ve todas las órdenes

### Validaciones:

- Carrito no vacío
- Usuario autenticado
- Estados válidos

---

## 🎯 Características Principales

### Para Usuarios:

✅ Ver historial de pedidos  
✅ Ver detalles completos de cada pedido  
✅ Ver estado actual del pedido  
✅ Ver texto personalizado en productos  
✅ Ver dirección de envío  
✅ Timeline visual del pedido

### Para Administradores:

✅ Ver todos los pedidos del sistema  
✅ Filtrar por estado  
✅ Cambiar estado del pedido  
✅ Ver detalles completos  
✅ Eliminar pedidos

---

## 📊 Estados del Pedido

```
PENDIENTE      → Pedido creado, esperando confirmación
    ↓
CONFIRMADO     → Pedido confirmado por el admin
    ↓
ENVIADO        → Pedido en camino
    ↓
ENTREGADO      → Pedido entregado al cliente
```

O en cualquier momento:

```
CANCELADO      → Pedido cancelado
```

---

## 🔌 Endpoints API

### Crear Orden (Checkout)

```
POST /orders/checkout
Headers: Authorization: Bearer {token}
Body: { shippingAddress: {...} }
Response: { _id, user_id, items, total, status, ... }
```

### Obtener Mis Órdenes

```
GET /orders/me
Headers: Authorization: Bearer {token}
Response: [{ order }, ...]
```

### Obtener Todas las Órdenes

```
GET /orders
Headers: Authorization: Bearer {token}
Response: [{ order }, ...]
```

### Actualizar Estado

```
PUT /orders/{orderId}/status
Headers: Authorization: Bearer {token}
Body: { status: "enviado" }
Response: { _id, ..., status: "enviado" }
```

---

## 📝 Ejemplo de Orden en Base de Datos

```json
{
  "_id": "507f1f77bcf86cd799439011",
  "user_id": "507f1f77bcf86cd799439012",
  "items": [
    {
      "product_id": "507f1f77bcf86cd799439013",
      "productTitle": "Camiseta Personalizada",
      "quantity": 2,
      "price": 15.99,
      "customization": {
        "customText": "Mi nombre aquí",
        "imagePlacement": {...}
      }
    }
  ],
  "total": 31.98,
  "status": "confirmado",
  "shippingAddress": {
    "street": "Calle Principal 123",
    "city": "Madrid",
    "zipCode": "28001",
    "country": "España"
  },
  "createdAt": "2026-04-19T09:40:00.000Z",
  "updatedAt": "2026-04-19T10:00:00.000Z"
}
```

---

## 🛠️ Archivos Modificados/Creados

### Backend:

- ✅ `API/models/order.js` (CREADO)
- ✅ `API/services/order-service.js` (CREADO)
- ✅ `API/routes/orders.js` (CREADO)
- ✅ `API/app.js` (MODIFICADO - registrado las rutas)

### Frontend - Services:

- ✅ `WEB/src/app/services/order-service.ts` (CREADO)
- ✅ `WEB/src/app/interfaces/order.ts` (CREADO)

### Frontend - Public Pages:

- ✅ `WEB/src/app/public/pages/orders/orders.ts` (CREADO)
- ✅ `WEB/src/app/public/pages/orders/orders.html` (CREADO)
- ✅ `WEB/src/app/public/pages/orders/orders.css` (CREADO)

### Frontend - Admin Pages:

- ✅ `WEB/src/app/admin/pages/orders/orders.ts` (CREADO)
- ✅ `WEB/src/app/admin/pages/orders/orders.html` (CREADO)
- ✅ `WEB/src/app/admin/pages/orders/orders.css` (CREADO)

### Frontend - Integration:

- ✅ `WEB/src/app/app.routes.ts` (MODIFICADO - rutas agregadas)
- ✅ `WEB/src/app/public/pages/cart/cart.ts` (MODIFICADO - método checkout)
- ✅ `WEB/src/app/public/pages/cart/cart.html` (MODIFICADO - botón checkout)
- ✅ `WEB/src/app/public/pages/cart/cart.css` (MODIFICADO - estilos botón)
- ✅ `WEB/src/app/public/components/navbar/navbar.html` (MODIFICADO - enlace pedidos)
- ✅ `WEB/src/app/admin/components/sidebar-component/sidebar-component.ts` (MODIFICADO - opción pedidos)

---

## ✨ Próximos Pasos Opcionales

1. **Envío de emails**: Notificaciones cuando cambia el estado del pedido
2. **Dirección de envío**: Formulario para que el usuario ingrese dirección en checkout
3. **Historial de cambios**: Registrar cada cambio de estado con timestamp
4. **Facturación**: Generar PDF de la factura
5. **Reporte de ventas**: Dashboard con métricas de pedidos
6. **Cancelación de pedidos**: Permitir al usuario cancelar antes de confirmación

---

## 🎉 Resumen

El sistema de pedidos está **completamente funcional y listo para usar**. Los usuarios pueden:

- Hacer checkout desde el carrito
- Ver sus pedidos en cualquier momento
- Ver el progreso del envío

Los administradores pueden:

- Ver todos los pedidos
- Cambiar estados
- Gestionar pedidos

Todo integrado de forma coherente con el diseño existente de la aplicación.
