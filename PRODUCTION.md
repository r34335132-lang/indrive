# Producción · Mercado Pago + Admin web + Webhook

## Seguridad (importante)

Publicaste credenciales en el chat. **rótalas** en el panel de Mercado Pago
antes de producción y usa las nuevas solo en secrets.

| Clave | Dónde vive |
|---|---|
| Public Key `APP_USR-…` (corta) | `.env` → `EXPO_PUBLIC_MP_PUBLIC_KEY` (cliente OK) |
| Access Token `APP_USR-…` (larga) | **Solo** Supabase secrets → `MERCADOPAGO_ACCESS_TOKEN` |

Nunca pongas el Access Token en la app ni en git.

## Webhook sin página web propia

Usamos **Supabase Edge Functions** (HTTPS gratis de tu proyecto):

```
https://<TU_PROJECT_REF>.supabase.co/functions/v1/mercadopago-webhook
```

1. Aplica la migración:
   ```bash
   npx supabase db push
   # o pega supabase/migrations/007_payments.sql en el SQL editor
   ```

2. Configura secrets (Access Token + service role):
   ```bash
   npx supabase secrets set MERCADOPAGO_ACCESS_TOKEN="APP_USR-TU_ACCESS_TOKEN"
   ```
   `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` ya existen en el proyecto al desplegar functions.

3. Despliega functions:
   ```bash
   npx supabase functions deploy create-payment
   npx supabase functions deploy mercadopago-webhook
   ```

4. En [Mercado Pago → Tu integración → Webhooks](https://www.mercadopago.com.mx/developers/panel/app):
   - URL producción: `https://<PROJECT_REF>.supabase.co/functions/v1/mercadopago-webhook`
   - Eventos: **Pagos** (`payment`)

No necesitas dominio ni hosting propio para el webhook.

## Flujo de pago en la app

1. Pasajero elige **Efectivo** o **Tarjeta · MP** al pedir viaje.
2. Si es **tarjeta**, abre Checkout Pro **de inmediato** (antes de buscar conductor).
3. El webhook marca `payment_status = approved` y entonces aparece a conductores.
4. Efectivo: se busca conductor al instante.

## Dashboard admin (igual que la app)

No hace falta otro backend: el admin ya está en `app/admin.tsx`.

### Opción A — Web desde Expo (rápido)

```bash
npx expo start --web
```

Entra con la cuenta admin → te manda a `/admin` (viajes, tarifas, charts).

### Opción B — Publicar el admin en internet (gratis)

1. Crea cuenta en [Vercel](https://vercel.com) (gratis).
2. Exporta la web:
   ```bash
   npx expo export --platform web
   ```
3. Sube la carpeta `dist` a Vercel (o conecta el repo y usa el script `web:export`).

O desde el teléfono/tablet: la misma build de producción, login como admin.

La URL del admin en Vercel **no** es el webhook; el webhook sigue siendo el de Supabase.

## App Store / Play Store

- Privacy Policy y Términos (Notion) están en login, perfil y registro conductor.
- **Eliminar cuenta** en perfil (pasajero) y menú conductor → Edge Function `delete-account`.
- Iconos: `assets/images/icon.png`, `adaptive-icon.png`, splash.
- Documentos del conductor: fotos privadas en Storage `driver-docs` (no públicas).
- Admin → pestaña **Docs** para aprobar/rechazar.
- Ubicación solo *while in use* (sin background).
- Cámara/galería solo para documentos, con textos de permiso claros.
- Versión app: `1.0.8` en `app.config.js`.

En App Store Connect / Play Console pega las mismas URLs de Notion en el listing.

### Deploy delete-account

```bash
npx supabase functions deploy delete-account
# SQL: migrations/011_account_deletion.sql
```

## Migración onboarding

```bash
# SQL: supabase/migrations/008_driver_onboarding.sql
# SQL: 009 + 010 (Sedan/SUV) en queries separadas
# SQL: 011_account_deletion.sql
```

Conductor: sube docs → puede entrar al hub → **no recibe viajes** hasta cubrir bloque $300
(depósito marcado o ganancias ≥ $300). La revisión de docs la aprueba el admin después.
