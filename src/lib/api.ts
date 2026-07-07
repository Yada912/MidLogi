/**
 * api.ts — All async data access functions for Kirimin.
 *
 * This module replaces the direct localStorage calls in storage.ts with
 * async calls to Supabase. The types from storage.ts are reused unchanged
 * so the rest of the app components require minimal modification.
 */

import { supabase } from './supabase';
import type { Package, UserProfile, DriverRoute, ChatMessage } from './storage';

// ─── Type adapters ────────────────────────────────────────────────────────────
// Map between the DB row shape and the app's TypeScript types.

function rowToPackage(row: any): Package {
  return {
    id:              row.id,
    category:        row.category,
    weightSize:      row.weight_size,
    photoName:       row.photo_name ?? '',
    handling:        row.handling ?? [],
    description:     row.description ?? '',
    pickupAddress:   row.pickup_address,
    pickupCoords:    { lat: row.pickup_lat, lng: row.pickup_lng },
    dropoffAddress:  row.dropoff_address,
    dropoffCoords:   { lat: row.dropoff_lat, lng: row.dropoff_lng },
    deliveryMethod:  row.delivery_method ?? 'Bertemu Langsung',
    instruction:     row.instruction ?? '',
    deliveryTime:    row.delivery_time ?? '',
    status:          row.status,
    price:           row.price ?? 0,
    detourFee:       row.detour_fee ?? 0,
    driverId:        row.driver_id ?? null,
    driverName:      row.driver_name ?? null,
    driverPhone:     row.driver_phone ?? null,
    driverAvatar:    row.driver_avatar ?? null,
    driverVehicle:   row.driver_vehicle ?? null,
    driverPlate:     row.driver_plate ?? null,
    buktiFoto:       row.bukti_foto ?? null,
    createdAt:       row.created_at,
    ownerId:         row.owner_id ?? undefined,
    paymentMethod:   row.payment_method ?? undefined,
    paymentStatus:   row.payment_status ?? undefined,
  };
}

function packageToRow(pkg: Partial<Package> & { id?: string }) {
  const row: any = {};
  if (pkg.id !== undefined)             row.id               = pkg.id;
  if (pkg.category !== undefined)       row.category         = pkg.category;
  if (pkg.weightSize !== undefined)     row.weight_size      = pkg.weightSize;
  if (pkg.photoName !== undefined)      row.photo_name       = pkg.photoName;
  if (pkg.handling !== undefined)       row.handling         = pkg.handling;
  if (pkg.description !== undefined)    row.description      = pkg.description;
  if (pkg.pickupAddress !== undefined)  row.pickup_address   = pkg.pickupAddress;
  if (pkg.pickupCoords !== undefined) {
    row.pickup_lat = pkg.pickupCoords.lat;
    row.pickup_lng = pkg.pickupCoords.lng;
  }
  if (pkg.dropoffAddress !== undefined) row.dropoff_address  = pkg.dropoffAddress;
  if (pkg.dropoffCoords !== undefined) {
    row.dropoff_lat = pkg.dropoffCoords.lat;
    row.dropoff_lng = pkg.dropoffCoords.lng;
  }
  if (pkg.deliveryMethod !== undefined) row.delivery_method  = pkg.deliveryMethod;
  if (pkg.instruction !== undefined)    row.instruction      = pkg.instruction;
  if (pkg.deliveryTime !== undefined)   row.delivery_time    = pkg.deliveryTime;
  if (pkg.status !== undefined)         row.status           = pkg.status;
  if (pkg.price !== undefined)          row.price            = pkg.price;
  if (pkg.detourFee !== undefined)      row.detour_fee       = pkg.detourFee;
  if (pkg.driverId !== undefined)       row.driver_id        = pkg.driverId;
  if (pkg.driverName !== undefined)     row.driver_name      = pkg.driverName;
  if (pkg.driverPhone !== undefined)    row.driver_phone     = pkg.driverPhone;
  if (pkg.driverAvatar !== undefined)   row.driver_avatar    = pkg.driverAvatar;
  if (pkg.driverVehicle !== undefined)  row.driver_vehicle   = pkg.driverVehicle;
  if (pkg.driverPlate !== undefined)    row.driver_plate     = pkg.driverPlate;
  if (pkg.buktiFoto !== undefined)      row.bukti_foto       = pkg.buktiFoto;
  if (pkg.ownerId !== undefined)        row.owner_id         = pkg.ownerId;
  if (pkg.paymentMethod !== undefined)  row.payment_method   = pkg.paymentMethod;
  if (pkg.paymentStatus !== undefined)  row.payment_status   = pkg.paymentStatus;
  return row;
}

function rowToProfile(row: any): UserProfile {
  return {
    id:           row.id,
    name:         row.name,
    email:        row.email ?? '',
    phone:        row.phone ?? '',
    role:         row.role,
    avatar:       row.avatar ?? undefined,
    createdAt:    row.created_at,
    location:     (row.location_lat && row.location_lng)
                    ? { lat: row.location_lat, lng: row.location_lng }
                    : undefined,
    locationName: row.location_name ?? undefined,
    rating:       row.rating ?? undefined,
    vehicle:      row.vehicle_type ? {
      type:           row.vehicle_type,
      plate:          row.vehicle_plate ?? '',
      color:          row.vehicle_color ?? '',
      maxPackageSize: row.vehicle_max_size ?? 'M',
    } : undefined,
  };
}

function profileToRow(p: Partial<UserProfile>) {
  const row: any = {};
  if (p.name !== undefined)         row.name           = p.name;
  if (p.phone !== undefined)        row.phone          = p.phone;
  if (p.role !== undefined)         row.role           = p.role;
  if (p.avatar !== undefined)       row.avatar         = p.avatar;
  if (p.location !== undefined) {
    row.location_lat = p.location.lat;
    row.location_lng = p.location.lng;
  }
  if (p.locationName !== undefined) row.location_name  = p.locationName;
  if (p.rating !== undefined)       row.rating         = p.rating;
  if (p.vehicle !== undefined) {
    row.vehicle_type     = p.vehicle.type;
    row.vehicle_plate    = p.vehicle.plate;
    row.vehicle_color    = p.vehicle.color ?? '';
    row.vehicle_max_size = p.vehicle.maxPackageSize;
  }
  return row;
}

function rowToRoute(row: any): DriverRoute {
  return {
    departureTime:       row.departure_time ?? '08:00',
    waypoints:           row.waypoints ?? [],
    maxPackets:          row.max_packets ?? 3,
    maxPackageSize:      row.max_package_size ?? 'L',
    acceptedCategories:  row.accepted_categories ?? [],
    active:              row.active ?? false,
  };
}

function rowToMessage(row: any): ChatMessage {
  return {
    id:         row.id,
    packetId:   row.package_id,
    senderRole: row.sender_role,
    text:       row.text,
    timestamp:  row.created_at,
    read:       row.read ?? false,
  };
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

/** Sign in with email and password. Returns the profile on success. */
export async function login(email: string, password: string): Promise<UserProfile> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) throw new Error(error?.message ?? 'Login gagal');

  let profile = await fetchProfile(data.user.id);

  // Auto-create profile if it doesn't exist yet (e.g. email confirmation flow)
  if (!profile) {
    const meta = data.user.user_metadata ?? {};
    const name = meta.name || email.split('@')[0];
    const phone = meta.phone || '';
    const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=2091e7&color=fff&size=128`;

    const { error: insertError } = await supabase.from('profiles').insert({
      id:            data.user.id,
      name,
      phone,
      role:          'pengirim',
      avatar:        avatarUrl,
      location_lat:  -6.2297,
      location_lng:  106.8294,
      location_name: 'Jakarta Pusat',
    });

    if (insertError) {
      console.error('Auto-create profile failed:', insertError);
      throw new Error('Gagal membuat profil otomatis. Hubungi admin.');
    }

    profile = await fetchProfile(data.user.id);
    if (!profile) throw new Error('Profil tidak ditemukan setelah pembuatan. Hubungi admin.');
  }

  return profile;
}

/** Register a new user. Returns the new profile. */
export async function signup(
  name: string,
  email: string,
  phone: string,
  password: string,
): Promise<UserProfile> {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name, phone },  // Store in auth metadata as backup
    },
  });

  if (error) {
    // Provide user-friendly messages for common errors
    if (error.message.includes('rate limit')) {
      throw new Error('Terlalu banyak percobaan. Coba lagi dalam beberapa menit.');
    }
    if (error.message.includes('already registered')) {
      throw new Error('Email sudah terdaftar. Silakan login.');
    }
    throw new Error(error.message || 'Registrasi gagal');
  }

  if (!data.user) {
    throw new Error('Registrasi gagal — tidak ada data user.');
  }

  // When email confirmation is ON, Supabase returns a user but identities
  // may be empty (meaning a fake/duplicate signup) or session is null.
  const needsConfirmation = !data.session;
  const isDuplicate = data.user.identities && data.user.identities.length === 0;

  if (isDuplicate) {
    throw new Error('Email sudah terdaftar. Silakan login.');
  }

  const userId = data.user.id;
  const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=2091e7&color=fff&size=128`;

  // Try to insert the profile row
  const { error: insertError } = await supabase.from('profiles').insert({
    id:            userId,
    name,
    phone,
    role:          'pengirim',
    avatar:        avatarUrl,
    location_lat:  -6.2297,
    location_lng:  106.8294,
    location_name: 'Jakarta Pusat',
  });

  // If profile insert fails due to RLS (user not confirmed yet), that's okay —
  // we'll create the profile row on first login instead.
  if (insertError && !needsConfirmation) {
    throw new Error(insertError.message || 'Gagal membuat profil.');
  }

  if (needsConfirmation) {
    // User needs to verify email first
    throw new Error(
      'CONFIRM_EMAIL:Akun berhasil dibuat! Cek email Anda untuk konfirmasi, lalu login.'
    );
  }

  return {
    id:           userId,
    name,
    email,
    phone,
    role:         'pengirim',
    avatar:       avatarUrl,
    createdAt:    new Date().toISOString(),
    location:     { lat: -6.2297, lng: 106.8294 },
    locationName: 'Jakarta Pusat',
  };
}

/** Sign out the current user. */
export async function logout(): Promise<void> {
  await supabase.auth.signOut();
}

/** Get the currently signed-in user's profile, or null if not logged in. */
export async function getCurrentProfile(): Promise<UserProfile | null> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return null;
  // Attach email from auth session
  const profile = await fetchProfile(session.user.id);
  if (profile) profile.email = session.user.email ?? '';
  return profile;
}

// ─── Profiles ─────────────────────────────────────────────────────────────────

export async function fetchProfile(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  if (error || !data) return null;
  return rowToProfile(data);
}

export async function fetchAllProfiles(): Promise<UserProfile[]> {
  const { data, error } = await supabase.from('profiles').select('*');
  if (error || !data) return [];
  return data.map(rowToProfile);
}

export async function updateProfile(userId: string, updates: Partial<UserProfile>): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update(profileToRow(updates))
    .eq('id', userId);
  if (error) throw new Error(error.message);
}

export async function addEarnings(driverId: string, amount: number): Promise<void> {
  // Use Supabase RPC to atomically increment
  const { error } = await supabase.rpc('increment_earnings', { uid: driverId, amount });
  if (error) {
    // Fallback: read-then-write
    const { data } = await supabase.from('profiles').select('earnings').eq('id', driverId).single();
    const current = data?.earnings ?? 0;
    await supabase.from('profiles').update({ earnings: current + amount }).eq('id', driverId);
  }
}

// ─── Packages ─────────────────────────────────────────────────────────────────

export async function fetchPackages(): Promise<Package[]> {
  const { data, error } = await supabase
    .from('packages')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) { console.error('fetchPackages:', error); return []; }
  return (data ?? []).map(rowToPackage);
}

export async function createPackage(pkg: Omit<Package, 'id' | 'createdAt'>): Promise<Package> {
  const { data: { session } } = await supabase.auth.getSession();
  const row = packageToRow(pkg as any);
  row.owner_id = session?.user?.id ?? null;
  const { data, error } = await supabase
    .from('packages')
    .insert(row)
    .select()
    .single();
  if (error || !data) throw new Error(error?.message ?? 'Gagal membuat paket');
  return rowToPackage(data);
}

/** Update specific fields of a package by ID. */
export async function updatePackage(id: string, updates: Partial<Package>): Promise<void> {
  const row = packageToRow(updates as any);
  const { error } = await supabase.from('packages').update(row).eq('id', id);
  if (error) throw new Error(error.message);
}

/** Delete a package (e.g. cancelled orders). */
export async function deletePackage(id: string): Promise<void> {
  const { error } = await supabase.from('packages').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

// ─── Driver Routes ────────────────────────────────────────────────────────────

export async function fetchDriverRoute(driverId: string): Promise<DriverRoute | null> {
  const { data, error } = await supabase
    .from('driver_routes')
    .select('*')
    .eq('driver_id', driverId)
    .single();
  if (error || !data) return null;
  return rowToRoute(data);
}

export async function upsertDriverRoute(driverId: string, route: DriverRoute): Promise<void> {
  const { error } = await supabase.from('driver_routes').upsert({
    driver_id:            driverId,
    departure_time:       route.departureTime,
    waypoints:            route.waypoints,
    max_packets:          route.maxPackets,
    max_package_size:     route.maxPackageSize,
    accepted_categories:  route.acceptedCategories,
    active:               route.active,
  }, { onConflict: 'driver_id' });
  if (error) throw new Error(error.message);
}

// ─── Chat Messages ────────────────────────────────────────────────────────────

export async function fetchMessages(packageId: string): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('package_id', packageId)
    .order('created_at', { ascending: true });
  if (error || !data) return [];
  return data.map(rowToMessage);
}

export async function sendMessage(
  packageId: string,
  text: string,
  senderRole: 'pengirim' | 'driver',
): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  const { error } = await supabase.from('chat_messages').insert({
    package_id:  packageId,
    sender_id:   session?.user?.id ?? null,
    sender_role: senderRole,
    text,
  });
  if (error) throw new Error(error.message);
}

// ─── Realtime subscriptions ───────────────────────────────────────────────────

/**
 * Subscribe to all package changes.
 * Returns an unsubscribe function.
 */
export function subscribeToPackages(callback: (packages: Package[]) => void): () => void {
  const channel = supabase
    .channel('packages_realtime')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'packages' },
      async () => {
        const updated = await fetchPackages();
        callback(updated);
      }
    )
    .subscribe();

  return () => { supabase.removeChannel(channel); };
}

/**
 * Subscribe to chat messages for a specific package.
 * Returns an unsubscribe function.
 */
export function subscribeToMessages(
  packageId: string,
  callback: (messages: ChatMessage[]) => void,
): () => void {
  const channel = supabase
    .channel(`chat_${packageId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'chat_messages',
        filter: `package_id=eq.${packageId}` },
      async () => {
        const msgs = await fetchMessages(packageId);
        callback(msgs);
      }
    )
    .subscribe();

  return () => { supabase.removeChannel(channel); };
}
