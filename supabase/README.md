# INRIDE + Supabase

## Migrations

1. Run [`migrations/001_init.sql`](migrations/001_init.sql)
2. Run [`migrations/002_tariff_time_bonuses.sql`](migrations/002_tariff_time_bonuses.sql) (minuto, espera, bloque sistema, cuota app, bonos Go/Plus/Master)
3. Run [`migrations/003_base_fare.sql`](migrations/003_base_fare.sql) (precio inicial $30, tarifa más baja $30; el bloque de $300 queda a cargo del conductor)
4. Run [`migrations/004_ride_messages.sql`](migrations/004_ride_messages.sql) (chat entre pasajero y conductor)

## 2. Env

Copy `.env.example` to `.env` at the repo root:

```
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_KEY
```

Maps use OpenStreetMap through MapLibre. No Google Maps key.

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
