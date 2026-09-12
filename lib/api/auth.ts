import { mapDocs, mapProfile } from '@/lib/api/mappers';
import { DEMO_ACCOUNTS, supabase } from '@/lib/supabase';
import type { DriverDocs, Profile, UserRole } from '@/types';

const emptyDocs: DriverDocs = {
  ineFront: false,
  ineBack: false,
  license: false,
  circulation: false,
  insurance: false,
  complete: false,
};

export async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
  if (error) throw error;
  return data ? mapProfile(data) : null;
}

export async function fetchDriverDocs(userId: string): Promise<DriverDocs> {
  const { data, error } = await supabase
    .from('driver_documents')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return mapDocs(data);
}

export async function switchActiveRole(userId: string, role: UserRole): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .update({ active_role: role })
    .eq('id', userId)
    .select('*')
    .single();
  if (error) throw error;
  return mapProfile(data);
}

export async function updateDriverDoc(
  userId: string,
  patch: Partial<Record<'ineFront' | 'ineBack' | 'license' | 'circulation' | 'insurance', boolean>>,
): Promise<DriverDocs> {
  const dbPatch = {
    ine_front: patch.ineFront,
    ine_back: patch.ineBack,
    license: patch.license,
    circulation: patch.circulation,
    insurance: patch.insurance,
  };
  const cleaned = Object.fromEntries(
    Object.entries(dbPatch).filter(([, v]) => v !== undefined),
  );

  const existing = await supabase.from('driver_documents').select('user_id').eq('user_id', userId).maybeSingle();
  if (!existing.data) {
    const { data, error } = await supabase
      .from('driver_documents')
      .insert({ user_id: userId, ...cleaned })
      .select('*')
      .single();
    if (error) throw error;
    return mapDocs(data);
  }

  const { data, error } = await supabase
    .from('driver_documents')
    .update(cleaned)
    .eq('user_id', userId)
    .select('*')
    .single();
  if (error) throw error;
  return mapDocs(data);
}

export async function setAllDriverDocsUploaded(userId: string): Promise<DriverDocs> {
  return updateDriverDoc(userId, {
    ineFront: true,
    ineBack: true,
    license: true,
    circulation: true,
    insurance: true,
  });
}

type DemoKey = keyof typeof DEMO_ACCOUNTS;

const DEMO_META: Record<
  DemoKey,
  Record<string, string | number | boolean | string[]>
> = {
  passenger: {
    name: 'Sofía García',
    first_name: 'Sofía',
    phone: '+52 618 123 4567',
    city: 'Durango, Dgo.',
    initials: 'SG',
    rating: 4.92,
    total_trips: 48,
    member_since: '2024',
    bio: 'Pasajera frecuente en Durango',
    roles: ['passenger', 'admin'],
    active_role: 'passenger',
  },
  driver: {
    name: 'Mauricio Hernández',
    first_name: 'Mauricio',
    phone: '+52 618 987 6543',
    city: 'Durango, Dgo.',
    initials: 'MH',
    rating: 4.98,
    total_trips: 312,
    member_since: '2023',
    bio: 'Toyota Corolla · NRA-218',
    roles: ['driver'],
    active_role: 'driver',
    vehicle_make: 'Toyota',
    vehicle_model: 'Corolla',
    vehicle_color: 'verde',
    vehicle_plate: 'NRA-218',
    docs_complete: true,
  },
  admin: {
    name: 'Admin INRIDE',
    first_name: 'Admin',
    phone: '+52 618 000 0000',
    city: 'Durango, Dgo.',
    initials: 'AD',
    rating: 5,
    total_trips: 0,
    member_since: '2024',
    bio: 'Panel de control y tarifario',
    roles: ['admin'],
    active_role: 'admin',
  },
};

export async function loginWithPassword(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export type RegisterPassengerInput = {
  name: string;
  email: string;
  phone: string;
  password: string;
  city?: string;
};

export type RegisterDriverInput = RegisterPassengerInput & {
  vehicleMake: string;
  vehicleModel: string;
  vehicleColor: string;
  vehiclePlate: string;
  driverTier?: 'go' | 'plus' | 'master';
};

function initialsFromName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'IR';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

export async function registerPassenger(input: RegisterPassengerInput) {
  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();
  const firstName = name.split(/\s+/)[0] || name;
  const meta = {
    name,
    first_name: firstName,
    phone: input.phone.trim(),
    city: input.city?.trim() || 'Durango, Dgo.',
    initials: initialsFromName(name),
    roles: ['passenger'],
    active_role: 'passenger',
  };

  const { data, error } = await supabase.auth.signUp({
    email,
    password: input.password,
    options: { data: meta },
  });
  if (error) throw error;

  if (!data.session) {
    const again = await supabase.auth.signInWithPassword({ email, password: input.password });
    if (again.error) {
      throw new Error(
        'Cuenta creada. Si pide confirmar email, desactívalo en Supabase Auth o confirma el correo.',
      );
    }
    return again.data;
  }

  if (data.user) {
    await supabase
      .from('profiles')
      .update({
        name,
        first_name: firstName,
        phone: input.phone.trim(),
        city: input.city?.trim() || 'Durango, Dgo.',
        initials: initialsFromName(name),
        roles: ['passenger'],
        active_role: 'passenger',
      })
      .eq('id', data.user.id);
  }

  return data;
}

export async function registerDriver(input: RegisterDriverInput) {
  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();
  const firstName = name.split(/\s+/)[0] || name;
  const tier = input.driverTier ?? 'go';
  const bio = `${input.vehicleMake} ${input.vehicleModel} · ${input.vehiclePlate}`;
  const meta = {
    name,
    first_name: firstName,
    phone: input.phone.trim(),
    city: input.city?.trim() || 'Durango, Dgo.',
    initials: initialsFromName(name),
    roles: ['driver'],
    active_role: 'driver',
    vehicle_make: input.vehicleMake.trim(),
    vehicle_model: input.vehicleModel.trim(),
    vehicle_color: input.vehicleColor.trim(),
    vehicle_plate: input.vehiclePlate.trim().toUpperCase(),
    bio,
    docs_complete: false,
  };

  const { data, error } = await supabase.auth.signUp({
    email,
    password: input.password,
    options: { data: meta },
  });
  if (error) throw error;

  let sessionData = data;
  if (!data.session) {
    const again = await supabase.auth.signInWithPassword({ email, password: input.password });
    if (again.error) {
      throw new Error(
        'Cuenta creada. Si pide confirmar email, desactívalo en Supabase Auth o confirma el correo.',
      );
    }
    sessionData = again.data;
  }

  const userId = sessionData.user?.id;
  if (userId) {
    await supabase
      .from('profiles')
      .update({
        name,
        first_name: firstName,
        phone: input.phone.trim(),
        city: input.city?.trim() || 'Durango, Dgo.',
        initials: initialsFromName(name),
        roles: ['driver'],
        active_role: 'driver',
        vehicle_make: input.vehicleMake.trim(),
        vehicle_model: input.vehicleModel.trim(),
        vehicle_color: input.vehicleColor.trim(),
        vehicle_plate: input.vehiclePlate.trim().toUpperCase(),
        bio,
        driver_tier: tier,
      })
      .eq('id', userId);

    await supabase.from('driver_documents').upsert({
      user_id: userId,
      ine_front: false,
      ine_back: false,
      license: false,
      circulation: false,
      insurance: false,
    });
  }

  return sessionData;
}

export async function loginAsDemo(key: DemoKey) {
  const account = DEMO_ACCOUNTS[key];
  const meta = DEMO_META[key];

  const signedIn = await supabase.auth.signInWithPassword({
    email: account.email,
    password: account.password,
  });

  if (!signedIn.error && signedIn.data.session) {
    // Ensure role/docs for existing accounts
    const userId = signedIn.data.user!.id;
    await supabase
      .from('profiles')
      .update({
        name: String(meta.name),
        first_name: String(meta.first_name),
        phone: String(meta.phone),
        roles: meta.roles as UserRole[],
        active_role: meta.active_role as UserRole,
        bio: meta.bio ? String(meta.bio) : null,
        vehicle_make: meta.vehicle_make ? String(meta.vehicle_make) : null,
        vehicle_model: meta.vehicle_model ? String(meta.vehicle_model) : null,
        vehicle_color: meta.vehicle_color ? String(meta.vehicle_color) : null,
        vehicle_plate: meta.vehicle_plate ? String(meta.vehicle_plate) : null,
        rating: Number(meta.rating ?? 5),
        total_trips: Number(meta.total_trips ?? 0),
        initials: String(meta.initials ?? 'IR'),
      })
      .eq('id', userId);

    if (key === 'driver') {
      await setAllDriverDocsUploaded(userId);
    }
    return signedIn.data;
  }

  const { data, error } = await supabase.auth.signUp({
    email: account.email,
    password: account.password,
    options: { data: meta },
  });
  if (error) throw error;
  if (!data.session) {
    // Email confirm may be required — try sign-in again
    const again = await supabase.auth.signInWithPassword({
      email: account.email,
      password: account.password,
    });
    if (again.error) throw again.error;
    return again.data;
  }
  return data;
}

export async function logoutSession() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export { emptyDocs };
