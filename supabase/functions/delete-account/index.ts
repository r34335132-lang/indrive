// Elimina la cuenta del usuario autenticado (Apple 5.1.1).
// Secrets: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: cors });
  }
  if (req.method !== 'POST') {
    return json({ error: 'Método no permitido' }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? Deno.env.get('EXPO_PUBLIC_SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

    if (!supabaseUrl || !serviceKey) {
      return json({ error: 'Faltan secrets de Supabase' }, 500);
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
    const userId = user.id;

    // Anonimizar datos visibles en viajes
    await admin
      .from('rides')
      .update({
        passenger_name: 'Usuario eliminado',
        passenger_rating: 5,
      })
      .eq('passenger_id', userId);

    await admin
      .from('rides')
      .update({
        driver_name: 'Conductor eliminado',
        driver_car: null,
        driver_plate: null,
        driver_rating: null,
      })
      .eq('driver_id', userId);

    // Borrar documentos privados del storage
    const { data: files } = await admin.storage.from('driver-docs').list(userId);
    if (files?.length) {
      const paths = files.map((f) => `${userId}/${f.name}`);
      await admin.storage.from('driver-docs').remove(paths);
    }

    // Cascades: profiles → driver_documents
    const { error: delError } = await admin.auth.admin.deleteUser(userId);
    if (delError) {
      return json({ error: delError.message || 'No se pudo eliminar la cuenta' }, 500);
    }

    return json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Error al eliminar cuenta';
    return json({ error: message }, 500);
  }
});
