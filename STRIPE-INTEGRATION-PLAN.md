# Plan de Integración de Stripe (v2 - Corregido)

## Flujo de checkout robusto (con Webhooks)

### Problema crítico identificado y solucionado

**Problema original**: El frontend confirma el pago con Stripe y luego llama al backend para crear la orden. Si el usuario cierra la pestaña o se cae la red entre ambos pasos, el usuario paga pero la orden nunca se crea.

**Solución: Webhooks de Stripe + orden `pending_payment`**

```
1. POST /orders/create-payment-intent
   ─ Backend valida carrito, calcula total
   ─ Crea la orden en BD con status: 'pending_payment'
   ─ Guarda orderId en los metadata del PaymentIntent
   ─ Crea PaymentIntent en Stripe con setup_future_usage si aplica
   ─ Devuelve { clientSecret, paymentIntentId, orderId }

2. Frontend: stripe.confirmCardPayment(clientSecret, cardElement)
   ─ Stripe procesa el pago (3D Secure si aplica)
   ─ Al recibir ok, redirige a página de confirmación
   ─ NO necesita llamar a POST /orders/checkout

3. Webhook: Stripe → POST /stripe/webhook (payment_intent.succeeded)
   ─ Stripe llama a tu backend (servidor a servidor, garantizado)
   ─ Busca la orden por orderId en PaymentIntent.metadata
   ─ Si la orden está 'pending_payment' → la pasa a 'pendiente'
   ─ Descuenta stock, vacía carrito, envía email de confirmación
   ─ Si ya está procesada (idempotente), no hace nada

4. Frontend (paralelo):
   ─ Opcional: polling a GET /orders/:orderId hasta que status !== 'pending_payment'
   ─ O simplemente esperar unos segundos y recargar
```

Esto garantiza que **siempre** que Stripe confirme un cobro, la orden se procesa.

---

## Nuevos archivos

| Archivo | Propósito |
|---------|-----------|
| `API/services/stripe-service.js` | Servicio backend Stripe (PaymentIntent, Customer, PaymentMethod, Webhook verificación) |
| `WEB/src/app/services/stripe-service.ts` | Servicio frontend Stripe.js (loadStripe, confirmCardPayment) |
| `WEB/src/environments/environment.ts` | Almacenar `STRIPE_PUBLISHABLE_KEY` |
| `API/routes/stripe-webhook.js` | Ruta para webhooks de Stripe (raw body parsing) |

## Archivos a modificar

### Backend

| Archivo | Cambios |
|---------|---------|
| `API/package.json` | Añadir `"stripe": "^17.0.0"` |
| `.env.example` | Añadir `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET` |
| `docker-compose.yml` | Añadir env vars Stripe al contenedor tfg-api |
| `API/app.js` | Registrar `POST /stripe/webhook` (debe ser raw body, sin express.json) |
| `API/routes/orders.js` | Modificar `POST /orders/create-payment-intent` (crea orden + PaymentIntent); eliminar lógica de checkout directo |
| `API/models/order.js` | Añadir `paymentIntentId`, `stripePaymentMethodId`, `stripeCustomerId` |
| `API/services/order-service.js` | Añadir métodos para crear orden pending_payment, actualizar a pendiente |
| `API/services/user-service.js` | Añadir actualización de `stripeCustomerId` |
| `API/routes/users.js` | Devolver `stripeCustomerId` en respuestas de perfil; manejar guardado de PaymentMethod |

### Frontend

| Archivo | Cambios |
|---------|---------|
| `WEB/package.json` | Añadir `"@stripe/stripe-js": "^5.0.0"` |
| `WEB/src/environments/environment.ts` | Nueva: `export const environment = { stripePublishableKey: '...' }` |
| `WEB/src/app/interfaces/order.ts` | Añadir `paymentIntentId?: string`, `stripePaymentMethodId?: string` |
| `WEB/src/app/interfaces/auth-user.ts` | Cambiar `savedPaymentMethod` a `stripeCustomerId`, `stripePaymentMethods[]` con `{ id, brand, last4, expMonth, expYear }` |
| `WEB/src/app/services/order-service.ts` | Añadir `createPaymentIntent()` |
| `WEB/src/app/services/auth-service.ts` | Actualizar interfaces para Stripe |
| `WEB/src/app/public/pages/checkout/checkout.ts` | Eliminar inputs raw de tarjeta; añadir Stripe Elements CardElement; nuevo flujo: createPaymentIntent → confirmCardPayment → redirigir |
| `WEB/src/app/public/pages/checkout/checkout.html` | Reemplazar inputs de tarjeta por div `#card-element`; mostrar tarjetas guardadas desde Stripe; cambiar texto descriptivo |
| `WEB/src/app/public/pages/checkout/checkout.css` | Añadir estilos para Stripe Element (`.StripeElement`, `.StripeElement--focus`, `.StripeElement--invalid`) |
| `WEB/src/app/public/pages/profile/profile.ts` | Mostrar/eliminar tarjetas guardadas vía Stripe API |
| `WEB/src/app/public/pages/profile/profile.html` | Mostrar brand + last4 + expiry de Stripe |

---

## Detalle de implementación

### 1. Stripe Service Backend (`API/services/stripe-service.js`)

```js
class StripeService {
  // PaymentIntents
  async createPaymentIntent(amount, orderId, customerId = null, saveCard = false)
    // Crea PaymentIntent con amount en céntimos, EUR
    // metadata: { orderId }
    // Si saveCard → setup_future_usage: 'off_session'
    // Si customerId → customer: customerId
    // Retorna { clientSecret, id }

  async retrievePaymentIntent(paymentIntentId)
    // Recupera y verifica PaymentIntent

  // Customers
  async findOrCreateCustomer(userId, email, name)
    // Busca stripeCustomerId en el user, si no tiene crea Customer nuevo

  // PaymentMethods
  async attachPaymentMethod(paymentMethodId, customerId)
    // Attach + set as default

  async getSavedPaymentMethods(customerId)
    // Retorna lista de PaymentMethods (brand, last4, expMonth, expYear, id)

  async detachPaymentMethod(paymentMethodId)
    // Desvincula PaymentMethod del Customer

  // Webhooks
  constructEvent(payload, signature, webhookSecret)
    // Verifica firma del webhook

  async handlePaymentIntentSucceeded(paymentIntent)
    // Busca orderId en metadata
    // Recupera order de BD
    // Si status === 'pending_payment' → pasa a 'pendiente', descuenta stock, email
}
```

### 2. Orden `pending_payment`

**Nuevo endpoint `POST /orders/create-payment-intent`**:
- Body: `{ personalData, shippingAddress, couponCode, saveCard }`
- Valida personal data (como antes)
- Obtiene carrito, calcula subtotal, valida cupón
- **Crea la orden en BD con `status: 'pending_payment'`** y `paymentIntentId: null`
- Crea o reusa Stripe Customer si `saveCard` o el usuario ya tiene uno
- Crea PaymentIntent con `metadata: { orderId }`, `setup_future_usage` si aplica
- Actualiza la orden con el `paymentIntentId` generado
- Devuelve `{ clientSecret, paymentIntentId, orderId }`

**Modificación de `POST /orders/checkout`**: Se elimina o se reemplaza por lógica de webhook.

### 3. Webhook endpoint (`POST /stripe/webhook`)

**Importante**: El webhook debe recibir el body RAW (no parseado por express.json). En `app.js`:

```js
// Registrar webhook route ANTES del express.json global
app.use('/stripe/webhook', express.raw({ type: 'application/json' }), stripeWebhookRouter);
```

**Manejo de eventos**:
- `payment_intent.succeeded`:
  1. Extraer `orderId` de `paymentIntent.metadata`
  2. Buscar orden en BD
  3. Si `status === 'pending_payment'`:
     - Actualizar a `status: 'pendiente'`
     - Almacenar `paymentIntentId` y `stripePaymentMethodId`
     - Descontar stock
     - Limpiar carrito
     - Enviar email confirmación
     - Si `saveCard`: adjuntar PaymentMethod al Customer
  4. Si ya `status !== 'pending_payment'` → idempotente, ignorar
- `payment_intent.payment_failed`: Loggear error
- Responder siempre `{ received: true }` a Stripe

### 4. Frontend - Stripe Elements

**checkout.html**:
```html
<!-- Stripe Card Element reemplaza número, caducidad y CVV -->
<label class="payment-field payment-field--wide">
  <span>Datos de la tarjeta</span>
  <div #cardElement class="stripe-card-element"></div>
  <small *ngIf="cardError" class="payment-field__error">{{ cardError }}</small>
</label>
```

**checkout.ts - Nuevo flujo**:

```
ngOnInit():
  - Cargar perfil, tarjetas guardadas (stripePaymentMethods del usuario)

confirmPaymentAndCheckout():
  1. Validar formulario (personalData, shippingAddress, cardHolder, terms)
  2. Si tarjeta guardada seleccionada:
     - Usar savedPaymentMethodId en lugar de CardElement
  3. Llamar orderService.createPaymentIntent({ personalData, shippingAddress, couponCode, saveCard })
  4. Obtener stripeInstance del StripeService
  5. Llamar stripe.confirmCardPayment(clientSecret, {
       payment_method: {
         card: cardElement,  // o savedPaymentMethodId si usa tarjeta guardada
         billing_details: { name: cardHolder }
       }
     })
  6. Si { paymentIntent: { status: 'succeeded' } }:
     - Redirigir a /pedidos/:orderId
     - O mostrar modal de éxito con Opcional: polling a GET /orders/:orderId
  7. Si error: mostrar error al usuario
```

**Tarjetas guardadas**:
- Si usuario tiene `stripeCustomerId`, backend devuelve lista de PaymentMethods
- Se muestran como antes (brand + last4 + expiry)
- Al seleccionar "Usar esta tarjeta":
  - El CardElement se oculta
  - `confirmCardPayment` usa `payment_method: savedPaymentMethodId`
  - Stripe maneja 3D Secure automáticamente si el banco lo requiere
- Al guardar tarjeta: se pasa `saveCard: true` en `createPaymentIntent`
  - El PaymentIntent se crea con `setup_future_usage: 'off_session'`
  - En el webhook, se adjunta el PaymentMethod al Customer

### 5. Tarjetas guardadas - consideraciones SCA

Aunque la tarjeta esté guardada, la normativa europea SCA puede exigir 3D Secure. Stripe.js maneja esto automáticamente:

```js
// Para tarjeta guardada, el flujo es el mismo:
const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
  payment_method: savedPaymentMethodId
});
// Si 3D Secure es necesario, Stripe muestra el pop-up automáticamente
```

### 6. Migración de usuarios (stripeCustomerId)

**En el backend**, siempre verificar antes de operar con Stripe:

```js
// stripe-service.js
async getSavedPaymentMethods(userId) {
  const user = await userService.findUserById(userId);
  if (!user || !user.stripeCustomerId) return [];  // ← Seguro
  const methods = await stripe.paymentMethods.list({
    customer: user.stripeCustomerId,
    type: 'card',
  });
  return methods.data.map(m => ({
    id: m.id,
    brand: m.card.brand,
    last4: m.card.last4,
    expMonth: m.card.exp_month,
    expYear: m.card.exp_year,
  }));
}
```

El `stripeCustomerId` se crea **la primera vez** que el usuario guarda una tarjeta o paga con `saveCard: true`.

---

## Variables de entorno

```
# Stripe
STRIPE_SECRET_KEY=sk_test_51...
STRIPE_PUBLISHABLE_KEY=pk_test_51...
STRIPE_WEBHOOK_SECRET=whsec_...
```

Añadir a `docker-compose.yml` en `tfg-api.environment`:
```yaml
STRIPE_SECRET_KEY: ${STRIPE_SECRET_KEY}
STRIPE_PUBLISHABLE_KEY: ${STRIPE_PUBLISHABLE_KEY}
STRIPE_WEBHOOK_SECRET: ${STRIPE_WEBHOOK_SECRET}
```

---

## Resumen de cambios vs estado actual

| Aspecto | Antes (falso) | Después (Stripe real) |
|---------|---------------|----------------------|
| Número tarjeta | Input texto plano | Stripe Card Element (iframe PCI-DSS) |
| Caducidad | Input texto plano | Stripe Card Element |
| CVV | Input texto plano | Stripe Card Element |
| Pago real | ❌ No | ✅ Sí, vía Stripe API |
| 3D Secure | No | ✅ Sí, automático |
| Creación de orden | Directa sin pago | `pending_payment` → webhook → `pendiente` |
| Confirmación cobro | Ninguna | Webhook Stripe (garantizado) |
| Riesgo cobro sin orden | ❌ Crítico | ✅ Eliminado (webhook + orden previa) |
| Guardar tarjeta | Raw card number en MongoDB | Stripe PaymentMethod ID (seguro PCI) |
| Reutilizar tarjeta | No realmente | Sí, vía Stripe Customer + 3D Secure |
| Cumplimiento PCI | ❌ No | ✅ Sí (Stripe Elements, tú no tocas datos) |

---

## Orden de implementación

1. Instalar dependencias (`stripe` en API, `@stripe/stripe-js` en WEB)
2. Crear `API/services/stripe-service.js`
3. Modificar `API/models/order.js` (nuevos campos: `paymentIntentId`, `status: pending_payment`)
4. Modificar `API/services/order-service.js` (crear orden `pending_payment`, actualizar tras webhook)
5. Modificar `API/services/user-service.js` (guardar `stripeCustomerId`)
6. Crear `API/routes/stripe-webhook.js` (manejar eventos Stripe)
7. Modificar `API/routes/orders.js` (nuevo endpoint `create-payment-intent`, eliminar checkout directo)
8. Modificar `API/app.js` (registrar webhook route con raw body)
9. Modificar `API/routes/users.js` (devolver datos Stripe)
10. Crear `WEB/src/environments/environment.ts`
11. Crear `WEB/src/app/services/stripe-service.ts`
12. Modificar interfaces (`order.ts`, `auth-user.ts`)
13. Modificar `WEB/src/app/services/order-service.ts`
14. Modificar `checkout.ts`, `checkout.html`, `checkout.css`
15. Modificar `profile.ts`, `profile.html`
16. Actualizar `.env.example` y `docker-compose.yml`
