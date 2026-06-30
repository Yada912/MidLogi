import type { Coordinate } from './mockData';

// ─── Package ─────────────────────────────────────────────────────────────────
export interface Package {
  id: string;
  category: string;
  weightSize: 'XS' | 'S' | 'M' | 'L' | 'XL';
  photoName: string;
  handling: string[];
  description: string;
  pickupAddress: string;
  pickupCoords: Coordinate;
  dropoffAddress: string;
  dropoffCoords: Coordinate;
  deliveryMethod: 'Bertemu Langsung' | 'Tinggalkan di Lokasi';
  instruction: string;
  deliveryTime: string;
  status: 'Draft' | 'Mencari Driver' | 'Menunggu Pick-up' | 'Dalam Perjalanan' | 'Telah Tiba' | 'Dibatalkan';
  price: number;
  detourFee: number;
  driverId: string | null;
  driverName: string | null;
  driverPhone: string | null;
  driverAvatar: string | null;
  driverVehicle: string | null;
  driverPlate: string | null;
  buktiFoto: string | null;
  createdAt: string;
  /** ID of the user who created this package */
  ownerId?: string;
}

// ─── Driver Route ─────────────────────────────────────────────────────────────
export interface DriverRoute {
  departureTime: string;
  waypoints: { name: string; lat: number; lng: number }[];
  maxPackets: number;
  maxPackageSize: 'XS' | 'S' | 'M' | 'L' | 'XL';
  acceptedCategories: string[];
  active: boolean;
}

// ─── Chat Message ─────────────────────────────────────────────────────────────
export interface ChatMessage {
  id: string;
  packetId: string;
  senderRole: 'pengirim' | 'driver';
  text: string;
  timestamp: string;
  read: boolean;
}

// ─── User / Auth ──────────────────────────────────────────────────────────────
export interface Vehicle {
  type: 'Motor' | 'Mobil' | 'Pickup' | 'Bus';
  plate: string;
  maxPackageSize: 'XS' | 'S' | 'M' | 'L' | 'XL';
  color?: string;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  /** Primary role preference – can be switched in-app */
  role: 'pengirim' | 'driver';
  vehicle?: Vehicle;
  avatar?: string;
  createdAt: string;
}

// ─── Keys ────────────────────────────────────────────────────────────────────
const KEYS = {
  PACKETS:      'kirimin_packets',
  DRIVER_ROUTE: 'kirimin_driver_route',
  MESSAGES:     'kirimin_messages',
  USER_PROFILE: 'kirimin_user_profile',
};

// ─── Init ────────────────────────────────────────────────────────────────────
export function initializeStorage() {
  if (!localStorage.getItem(KEYS.PACKETS)) {
    localStorage.setItem(KEYS.PACKETS, JSON.stringify([]));
  }
  if (!localStorage.getItem(KEYS.DRIVER_ROUTE)) {
    const defaultRoute: DriverRoute = {
      departureTime: '08:00',
      waypoints: [
        { name: 'Rumah (Kebayoran Baru)', lat: -6.2442, lng: 106.7973 },
        { name: 'Kuningan (Kantor)',       lat: -6.2230, lng: 106.8294 },
      ],
      maxPackets: 3,
      maxPackageSize: 'L',
      acceptedCategories: ['Dokumen', 'Pakaian', 'Makanan'],
      active: false,
    };
    localStorage.setItem(KEYS.DRIVER_ROUTE, JSON.stringify(defaultRoute));
  }
  if (!localStorage.getItem(KEYS.MESSAGES)) {
    localStorage.setItem(KEYS.MESSAGES, JSON.stringify([]));
  }
}

// ─── Getters ─────────────────────────────────────────────────────────────────
export function getPackages(): Package[] {
  initializeStorage();
  const data = localStorage.getItem(KEYS.PACKETS);
  return data ? JSON.parse(data) : [];
}

export function getDriverRoute(): DriverRoute {
  initializeStorage();
  const data = localStorage.getItem(KEYS.DRIVER_ROUTE);
  return data ? JSON.parse(data) : {
    departureTime: '08:00', waypoints: [], maxPackets: 3,
    maxPackageSize: 'L', acceptedCategories: [], active: false,
  };
}

export function getChatMessages(): ChatMessage[] {
  initializeStorage();
  const data = localStorage.getItem(KEYS.MESSAGES);
  return data ? JSON.parse(data) : [];
}

export function getUserProfile(): UserProfile | null {
  const data = localStorage.getItem(KEYS.USER_PROFILE);
  return data ? JSON.parse(data) : null;
}

// ─── Setters ─────────────────────────────────────────────────────────────────
export function savePackages(packages: Package[]) {
  localStorage.setItem(KEYS.PACKETS, JSON.stringify(packages));
  window.dispatchEvent(new Event('storage_update'));
}

export function saveDriverRoute(route: DriverRoute) {
  localStorage.setItem(KEYS.DRIVER_ROUTE, JSON.stringify(route));
  window.dispatchEvent(new Event('storage_update'));
}

export function saveChatMessages(messages: ChatMessage[]) {
  localStorage.setItem(KEYS.MESSAGES, JSON.stringify(messages));
  window.dispatchEvent(new Event('storage_update'));
}

export function saveUserProfile(profile: UserProfile) {
  localStorage.setItem(KEYS.USER_PROFILE, JSON.stringify(profile));
  window.dispatchEvent(new Event('storage_update'));
}

export function clearUserProfile() {
  localStorage.removeItem(KEYS.USER_PROFILE);
  window.dispatchEvent(new Event('storage_update'));
}

// ─── Reset ───────────────────────────────────────────────────────────────────
export function clearSandboxData() {
  localStorage.removeItem(KEYS.PACKETS);
  localStorage.removeItem(KEYS.DRIVER_ROUTE);
  localStorage.removeItem(KEYS.MESSAGES);
  initializeStorage();
  window.dispatchEvent(new Event('storage_update'));
}

// ─── Subscription ─────────────────────────────────────────────────────────────
export function subscribeToStorage(callback: () => void) {
  const handleStorage = (e: StorageEvent) => {
    if (e.key === KEYS.PACKETS || e.key === KEYS.DRIVER_ROUTE ||
        e.key === KEYS.MESSAGES || e.key === KEYS.USER_PROFILE || !e.key) {
      callback();
    }
  };
  const handleLocal = () => callback();
  window.addEventListener('storage', handleStorage);
  window.addEventListener('storage_update', handleLocal);
  return () => {
    window.removeEventListener('storage', handleStorage);
    window.removeEventListener('storage_update', handleLocal);
  };
}
