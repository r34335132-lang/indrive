// Crea preferencia Checkout Pro de Mercado Pago para un viaje.
// Secrets: MERCADOPAGO_ACCESS_TOKEN, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: cors });
  }

  try {
    const mpToken = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN');
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? Deno.env.get('EXPO_PUBLIC_SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

    if (!mpToken || !supabaseUrl || !serviceKey) {
      return json({ error: 'Faltan secrets de Mercado Pago / Supabase' }, 500);
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'No autorizado' }, 401);

    const userClient = createClient(supabaseUrl, anonKey || serviceKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();
    if (userError || !user) return json({ error: 'Sesión inválida' }, 401);

    const body = (await req.json()) as { rideId?: string };
    if (!body.rideId) return json({ error: 'rideId requerido' }, 400);

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: ride, error: rideError } = await admin
      .from('rides')
      .select('*')
      .eq('id', body.rideId)
      .single();
    if (rideError || !ride) return json({ error: 'Viaje no encontrado' }, 404);
    if (ride.passenger_id !== user.id) return json({ error: 'No es tu viaje' }, 403);

    const amount = Number(ride.price);
    if (!Number.isFinite(amount) || amount <= 0) {
      return json({ error: 'Monto inválido' }, 400);
    }

    if (ride.payment_status === 'approved') {
      return json({ alreadyPaid: true, status: 'approved' });
    }

    const notificationUrl = `${supabaseUrl}/functions/v1/mercadopago-webhook`;
    const preference = {
      items: [
        {
          id: ride.id,
          title: `Viaje inride · ${String(ride.origin).slice(0, 40)} → ${String(ride.destination).slice(0, 40)}`,
          quantity: 1,
          currency_id: 'MXN',
          unit_price: Math.round(amount * 100) / 100,
        },
      ],
      payer: {
        email: user.email ?? undefined,
      },
      external_reference: ride.id,
      notification_url: notificationUrl,
      statement_descriptor: 'INRIDE',
      binary_mode: true,
      metadata: {
        ride_id: ride.id,
        passenger_id: user.id,
      },
      back_urls: {
        success: 'inride://payment/success',
        failure: 'inride://payment/failure',
        pending: 'inride://payment/pending',
      },
      auto_return: 'approved',
    };

    const mpRes = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${mpToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(preference),
    });
    const mpData = await mpRes.json();
    if (!mpRes.ok) {
      console.error('MP preference error', mpData);
      return json({ error: 'No se pudo crear el pago', detail: mpData }, 502);
    }

    const preferenceId = mpData.id as string;
    const initPoint = (mpData.init_point || mpData.sandbox_init_point) as string;

    await admin.from('rides').update({
      payment_method: 'card',
      payment_status: 'pending',
      mp_preference_id: preferenceId,
    }).eq('id', ride.id);

    await admin.from('payments').insert({
      ride_id: ride.id,
      passenger_id: user.id,
      amount,
      currency: 'MXN',
      status: 'pending',
      mp_preference_id: preferenceId,
    });

    return json({
      preferenceId,
      initPoint,
      amount,
      currency: 'MXN',
    });
  } catch (error) {
    console.error(error);
    return json({ error: error instanceof Error ? error.message : 'Error interno' }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
}
