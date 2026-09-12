# INRIDE + Supabase

## Migrations

1. Run [`migrations/001_init.sql`](migrations/001_init.sql)
2. Run [`migrations/002_tariff_time_bonuses.sql`](migrations/002_tariff_time_bonuses.sql) (minuto, espera, bloque sistema, cuota app, bonos Go/Plus/Master)

## 2. Env

Copy `.env.example` to `.env` at the repo root:

```
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_KEY
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=YOUR_ANDROID_MAPS_KEY
```

## 3. Demo users

In Authentication → Users, create (password for all: `InrideDemo1!`):

| Email | Purpose |
|-------|---------|
| sofia@inride.app | Passenger (+ admin role) |
| mauricio@inride.app | Driver |
| admin@inride.app | Admin |

Then run [`seed.sql`](seed.sql) to patch names/roles/docs.

Or use the app demo buttons once (they sign up with metadata if the user does not exist yet).

## 4. Google Maps (Android)

1. Google Cloud → enable **Maps SDK for Android**.
2. Create an API key and put it in `.env` + `app.json` `android.config.googleMaps.apiKey`.
3. For a physical device, prefer `npx expo run:android` (dev build) so the key is applied.

## 5. Two-device test

1. Device A: enter as Sofía → Pedir viaje.
2. Device B: enter as Mauricio → accept offer → follow pickup route → **Llegué** → **Iniciar viaje** → complete.
