import * as ImagePicker from 'expo-image-picker';
import { mapDocs } from '@/lib/api/mappers';
import { supabase } from '@/lib/supabase';
import type { DriverDocs, DriverDocumentKey } from '@/types';

const PATH_COLS: Record<DriverDocumentKey, string> = {
  ineFront: 'ine_front_path',
  ineBack: 'ine_back_path',
  license: 'license_path',
  circulation: 'circulation_path',
  insurance: 'insurance_path',
};

const FLAG_COLS: Record<DriverDocumentKey, string> = {
  ineFront: 'ine_front',
  ineBack: 'ine_back',
  license: 'license',
  circulation: 'circulation',
  insurance: 'insurance',
};

async function uriToArrayBuffer(uri: string): Promise<ArrayBuffer> {
  const res = await fetch(uri);
  return res.arrayBuffer();
}

/** Pide galería (o cámara) y sube el documento a Storage privado. */
export async function uploadDriverDocument(
  userId: string,
  key: DriverDocumentKey,
): Promise<DriverDocs> {
  const library = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!library.granted) {
    const cam = await ImagePicker.requestCameraPermissionsAsync();
    if (!cam.granted) {
      throw new Error('Necesitamos permiso de cámara o galería para subir documentos.');
    }
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 0.7,
    allowsEditing: true,
  });
  if (result.canceled || !result.assets[0]) {
    throw new Error('CANCELLED');
  }

  const asset = result.assets[0];
  const ext = (asset.fileName?.split('.').pop() || asset.uri.split('.').pop() || 'jpg')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '') || 'jpg';
  const mime = asset.mimeType || (ext === 'png' ? 'image/png' : 'image/jpeg');
  const path = `${userId}/${key}-${Date.now()}.${ext}`;
  const body = await uriToArrayBuffer(asset.uri);

  const { error: upError } = await supabase.storage.from('driver-docs').upload(path, body, {
    contentType: mime,
    upsert: true,
  });
  if (upError) throw upError;

  const patch: Record<string, unknown> = {
    [FLAG_COLS[key]]: true,
    [PATH_COLS[key]]: path,
    review_status: 'pending',
  };

  const existing = await supabase
    .from('driver_documents')
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle();

  if (!existing.data) {
    const { data, error } = await supabase
      .from('driver_documents')
      .insert({ user_id: userId, ...patch })
      .select('*')
      .single();
    if (error) throw error;
    return mapDocs(data);
  }

  const { data, error } = await supabase
    .from('driver_documents')
    .update(patch)
    .eq('user_id', userId)
    .select('*')
    .single();
  if (error) throw error;
  return mapDocs(data);
}

export async function setDriverDocsReviewStatus(
  userId: string,
  status: 'pending' | 'approved' | 'rejected',
  note?: string,
): Promise<DriverDocs> {
  const { data, error } = await supabase
    .from('driver_documents')
    .update({ review_status: status, review_note: note ?? null })
    .eq('user_id', userId)
    .select('*')
    .single();
  if (error) throw error;
  return mapDocs(data);
}

export async function markBlockFeeSatisfied(userId: string): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({
      block_fee_satisfied: true,
      block_fee_satisfied_at: new Date().toISOString(),
    })
    .eq('id', userId);
  if (error) throw error;
}

export type PendingDriverReview = {
  userId: string;
  name: string;
  email: string;
  phone: string;
  plate: string;
  reviewStatus: 'pending' | 'approved' | 'rejected';
  reviewNote: string | null;
  complete: boolean;
  docs: DriverDocs;
};

/** Lista conductores con docs pendientes (solo admin vía RLS). */
export async function listDriversForReview(): Promise<PendingDriverReview[]> {
  const { data: docsRows, error } = await supabase
    .from('driver_documents')
    .select('*')
    .eq('complete', true)
    .order('updated_at', { ascending: false });
  if (error) throw error;
  if (!docsRows?.length) return [];

  const ids = docsRows.map((d) => d.user_id as string);
  const { data: profiles, error: pError } = await supabase
    .from('profiles')
    .select('id, name, email, phone, vehicle_plate')
    .in('id', ids);
  if (pError) throw pError;

  const byId = new Map((profiles ?? []).map((p) => [p.id as string, p]));

  return docsRows.map((row) => {
    const profile = byId.get(row.user_id as string);
    const docs = mapDocs(row);
    return {
      userId: row.user_id as string,
      name: (profile?.name as string) || 'Conductor',
      email: (profile?.email as string) || '',
      phone: (profile?.phone as string) || '',
      plate: (profile?.vehicle_plate as string) || '—',
      reviewStatus: docs.reviewStatus || 'pending',
      reviewNote: docs.reviewNote ?? null,
      complete: Boolean(docs.complete),
      docs,
    };
  });
}
