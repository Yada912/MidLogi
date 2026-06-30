export interface Coordinate {
  lat: number;
  lng: number;
}

export interface LocationPreset {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
}

export interface DriverPreset {
  id: string;
  name: string;
  phone: string;
  avatar: string;
  rating: number;
  vehicle: string;
  vehiclePlate: string;
  routeWaypoints: { name: string; lat: number; lng: number }[];
  maxPackets: number;
  maxPackageSize: 'XS' | 'S' | 'M' | 'L' | 'XL';
  acceptedCategories: string[];
  detourFeeRate: number; // Cost per km of detour (Rupiah)
  baseFee: number; // Base cost (Rupiah)
}

export const LOCATION_PRESETS: LocationPreset[] = [
  { id: '1', name: 'Rumah', address: 'Jl. Sudirman No. 12, Jakarta Selatan', lat: -6.2297, lng: 106.7973 },
  { id: '2', name: 'Kantor', address: 'Menara BTPN, Mega Kuningan, Jakarta Selatan', lat: -6.2230, lng: 106.8294 },
  { id: '3', name: 'Mall Grand Indonesia', address: 'Jl. M.H. Thamrin No.1, Jakarta Pusat', lat: -6.1951, lng: 106.8231 },
  { id: '4', name: 'Bandara Soekarno-Hatta', address: 'Cengkareng, Tangerang, Banten', lat: -6.1256, lng: 106.6559 },
  { id: '5', name: 'Kampus UI Depok', address: 'Pondok Cina, Beji, Depok', lat: -6.3628, lng: 106.8240 }
];

export const VIRTUAL_DRIVERS: DriverPreset[] = [
  {
    id: 'vd_1',
    name: 'Budi Santoso',
    phone: '0812-3456-7890',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&fit=crop&q=80',
    rating: 4.8,
    vehicle: 'Toyota Avanza (Mobil)',
    vehiclePlate: 'B 1234 CDG',
    routeWaypoints: [
      { name: 'Rumah (Kebayoran Baru)', lat: -6.2442, lng: 106.7973 },
      { name: 'Kuningan (Kantor)', lat: -6.2230, lng: 106.8294 },
      { name: 'Grand Indonesia (Mall)', lat: -6.1951, lng: 106.8231 }
    ],
    maxPackets: 3,
    maxPackageSize: 'L',
    acceptedCategories: ['Dokumen', 'Pakaian', 'Makanan', 'Elektronik'],
    detourFeeRate: 2500,
    baseFee: 15000
  },
  {
    id: 'vd_2',
    name: 'Andi Wijaya',
    phone: '0857-9988-7766',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&fit=crop&q=80',
    rating: 4.9,
    vehicle: 'Honda Vario (Motor)',
    vehiclePlate: 'B 9876 XYZ',
    routeWaypoints: [
      { name: 'UI Depok', lat: -6.3628, lng: 106.8240 },
      { name: 'Cilandak Town Square', lat: -6.2915, lng: 106.8028 },
      { name: 'Sudirman', lat: -6.2297, lng: 106.7973 }
    ],
    maxPackets: 2,
    maxPackageSize: 'M',
    acceptedCategories: ['Dokumen', 'Pakaian', 'Makanan'],
    detourFeeRate: 1500,
    baseFee: 10000
  },
  {
    id: 'vd_3',
    name: 'Rian Hidayat',
    phone: '0813-1122-3344',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&fit=crop&q=80',
    rating: 4.7,
    vehicle: 'Suzuki Carry (Pick-up)',
    vehiclePlate: 'B 4567 KLA',
    routeWaypoints: [
      { name: 'Tangerang Kota', lat: -6.1781, lng: 106.6300 },
      { name: 'Bandara Soekarno-Hatta', lat: -6.1256, lng: 106.6559 },
      { name: 'Pluit, Jakarta Utara', lat: -6.1251, lng: 106.7925 }
    ],
    maxPackets: 5,
    maxPackageSize: 'XL',
    acceptedCategories: ['Dokumen', 'Pakaian', 'Makanan', 'Elektronik', 'Lainnya'],
    detourFeeRate: 3500,
    baseFee: 25000
  }
];

export const PACKAGE_SIZES = [
  { value: 'XS', label: 'XS (Dokumen/Kunci)', desc: 'Sangat kecil, muat di kantong' },
  { value: 'S', label: 'S (Kotak Kecil)', desc: 'Ukuran kotak sepatu kecil' },
  { value: 'M', label: 'M (Ransel)', desc: 'Muat dalam ransel standar' },
  { value: 'L', label: 'L (Kardus Sedang)', desc: 'Ukuran kardus mie instan' },
  { value: 'XL', label: 'XL (Kardus Besar)', desc: 'Memerlukan bagasi mobil/pick-up' }
];

export const CATEGORIES = ['Dokumen', 'Pakaian', 'Makanan', 'Elektronik', 'Lainnya'];
