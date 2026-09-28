# INRIDE + Supabase

## Migrations

1. Run [`migrations/001_init.sql`](migrations/001_init.sql)
2. Run [`migrations/002_tariff_time_bonuses.sql`](migrations/002_tariff_time_bonuses.sql) (minuto, espera, bloque sistema, cuota app, bonos Go/Plus/Master)
3. Run [`migrations/003_base_fare.sql`](migrations/003_base_fare.sql) (precio inicial / tarifa mínima)
4. Run [`migrations/004_ride_messages.sql`](migrations/004_ride_messages.sql) (chat entre pasajero y conductor)
5. Run [`migrations/005_laguna_affordable_tariff.sql`](migrations/005_laguna_affordable_tariff.sql) (tarifas accesibles La Laguna)
6. Run [`migrations/006_arrived_at.sql`](migrations/006_arrived_at.sql)
7. Run [`migrations/007_payments.sql`](migrations/007_payments.sql) (Mercado Pago)
8. Run [`migrations/008_driver_onboarding.sql`](migrations/008_driver_onboarding.sql) (docs + bloque $300 + storage)
9. Run [`migrations/009_vehicle_sedan_suv.sql`](migrations/009_vehicle_sedan_suv.sql) (enum Sedan / SUV)
10. Run [`migrations/010_vehicle_sedan_default.sql`](migrations/010_vehicle_sedan_default.sql) (default Sedan) — en una query aparte, después de 009
11. Run [`migrations/011_account_deletion.sql`](migrations/011_account_deletion.sql) (borrar cuenta App Store)
12. Deploy Edge Function: `npx supabase functions deploy delete-account`

## Mercado Pago

Ver [PRODUCTION.md](../PRODUCTION.md). Webhook:

`https://<PROJECT_REF>.supabase.co/functions/v1/mercadopago-webhook`

## 2. Env

Copy `.env.example` to `.env` at the repo root:

```
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_KEY
EXPO_PUBLIC_MP_PUBLIC_KEY=APP_USR-your-public-key
```

Maps use OpenStreetMap (Leaflet WebView). No Google Maps key.

Access Token de Mercado Pago → solo `supabase secrets`, nunca en la app.

## 3. Demo users

In Authentication → Users, create (password for all: `InrideDemo1!`):

| Email | Purpose |
|-------|---------|
| sofia@inride.app | Passenger (+ admin role) |
| mauricio@inride.app | Driver |
| admin@inride.app | Admin |

Then run [`seed.sql`](seed.sql) to patch names/roles/docs.

Or use the app demo buttons once (they sign up with metadata if the user does not exist yet).

## 4. Two-device test

1. Device A: enter as Sofía → Pedir viaje.
2. Device B: enter as Mauricio → accept offer → follow pickup route → **Llegué** → **Iniciar viaje** → complete.
