// Crea preferencia Checkout Pro para pagar el bloque de sistema diario del conductor.
// Body opcional: { blockId } — si no viene, cobra el bloque pendiente más antiguo.
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
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
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

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: profile } = await admin
      .from('profiles')
      .select('id, roles, email')
      .eq('id', user.id)
      .single();
    if (!profile || !(profile.roles as string[]).includes('driver')) {
      return json({ error: 'Solo conductores pueden pagar el bloque' }, 403);
    }

    const body = (await req.json().catch(() => ({}))) as { blockId?: string };
    let blockQuery = admin
      .from('driver_daily_blocks')
      .select('id, day, amount, status')
      .eq('driver_id', user.id);
    blockQuery = body.blockId
      ? blockQuery.eq('id', body.blockId)
      : blockQuery.eq('status', 'pending').order('day', { ascending: true }).limit(1);
    const { data: block } = await blockQuery.maybeSingle();
    if (!block || block.status !== 'pending') {
      return json({ alreadyPaid: true });
    }
    const amount = Math.round(Number(block.amount) * 100) / 100;
    const dayLabel = String(block.day).split('-').reverse().join('/');

    const { data: deposit, error: depError } = await admin
      .from('driver_deposits')
      .insert({ driver_id: user.id, amount, currency: 'MXN', status: 'pending', block_id: block.id })
      .select('id')
      .single();
    if (depError || !deposit) return json({ error: 'No se pudo registrar el pago' }, 500);

    const preference = {
      items: [
        {
          id: `deposit-${deposit.id}`,
          title: `Bloque de sistema inride · ${dayLabel}`,
          quantity: 1,
          currency_id: 'MXN',
          unit_price: amount,
        },
      ],
      payer: { email: user.email ?? undefined },
      external_reference: `deposit:${deposit.id}`,
      notification_url: `${supabaseUrl}/functions/v1/mercadopago-webhook`,
      statement_descriptor: 'INRIDE',
      binary_mode: true,
      metadata: { kind: 'driver_deposit', deposit_id: deposit.id, driver_id: user.id, block_id: block.id },
      back_urls: {
        success: 'inride://payment/deposit',
        failure: 'inride://payment/deposit',
        pending: 'inride://payment/deposit',
      },
      auto_return: 'approved',
    };

    const mpRes = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: { Authorization: `Bearer ${mpToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(preference),
    });
    const mpData = await mpRes.json();
    if (!mpRes.ok) {
      console.error('MP preference error', mpData);
      await admin.from('driver_deposits').update({ status: 'cancelled' }).eq('id', deposit.id);
      return json({ error: 'No se pudo crear el pago' }, 502);
    }

    await admin
      .from('driver_deposits')
      .update({ mp_preference_id: mpData.id })
      .eq('id', deposit.id);

    return json({
      depositId: deposit.id,
      blockId: block.id,
      preferenceId: mpData.id,
      initPoint: mpData.init_point || mpData.sandbox_init_point,
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
