// Webhook Mercado Pago → actualiza rides/payments.
// URL (sin sitio web propio): https://<PROJECT>.supabase.co/functions/v1/mercadopago-webhook
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
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    if (!mpToken || !supabaseUrl || !serviceKey) {
      return new Response('misconfigured', { status: 500, headers: cors });
    }

    const url = new URL(req.url);
    let paymentId =
      url.searchParams.get('data.id') ||
      url.searchParams.get('id') ||
      '';

    if (req.method === 'POST') {
      const contentType = req.headers.get('content-type') ?? '';
      if (contentType.includes('application/json')) {
        const body = await req.json().catch(() => ({})) as {
          type?: string;
          action?: string;
          data?: { id?: string };
          id?: string;
        };
        if (body?.data?.id) paymentId = String(body.data.id);
        else if (body?.id && (body.type === 'payment' || body.action?.includes('payment'))) {
          paymentId = String(body.id);
        }
      } else {
        const form = await req.formData().catch(() => null);
        const topic = form?.get('topic') ?? form?.get('type');
        const id = form?.get('id') ?? form?.get('data.id');
        if (topic === 'payment' && id) paymentId = String(id);
      }
    }

    if (!paymentId) {
      // MP a veces hace ping vacío — responder 200
      return new Response('ok', { status: 200, headers: cors });
    }

    const payRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${mpToken}` },
    });
    const payment = await payRes.json();
    if (!payRes.ok) {
      console.error('MP get payment', payment);
      return new Response('payment fetch failed', { status: 502, headers: cors });
    }

    const rideId = String(payment.external_reference || payment.metadata?.ride_id || '');
    const statusRaw = String(payment.status || '');
    const mapped =
      statusRaw === 'approved'
        ? 'approved'
        : statusRaw === 'rejected' || statusRaw === 'cancelled'
          ? statusRaw === 'cancelled'
            ? 'cancelled'
            : 'rejected'
          : statusRaw === 'refunded'
            ? 'refunded'
            : 'pending';

    const admin = createClient(supabaseUrl, serviceKey);

    if (rideId) {
      const ridePatch: Record<string, unknown> = {
        payment_status: mapped,
        mp_payment_id: String(payment.id),
        payment_method: 'card',
      };
      if (mapped === 'approved') ridePatch.paid_at = new Date().toISOString();
      await admin.from('rides').update(ridePatch).eq('id', rideId);

      const { data: existing } = await admin
        .from('payments')
        .select('id')
        .eq('mp_payment_id', String(payment.id))
        .maybeSingle();

      if (existing?.id) {
        await admin
          .from('payments')
          .update({
            status: mapped,
            mp_status_detail: payment.status_detail ?? null,
            raw: payment,
          })
          .eq('id', existing.id);
      } else {
        const passengerId =
          payment.metadata?.passenger_id ||
          (
            await admin.from('rides').select('passenger_id').eq('id', rideId).maybeSingle()
          ).data?.passenger_id;
        if (passengerId) {
          await admin.from('payments').insert({
            ride_id: rideId,
            passenger_id: passengerId,
            amount: Number(payment.transaction_amount) || 0,
            currency: payment.currency_id || 'MXN',
            status: mapped,
            mp_preference_id: payment.preference_id ?? null,
            mp_payment_id: String(payment.id),
            mp_status_detail: payment.status_detail ?? null,
            raw: payment,
          });
        }
      }
    }

    return new Response('ok', { status: 200, headers: cors });
  } catch (error) {
    console.error(error);
    return new Response('error', { status: 500, headers: cors });
  }
});
