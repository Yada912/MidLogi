# Kirimin — Crowdsourced Logistics Web App

**Kirimin** adalah prototipe aplikasi web logistik berbasis jaringan komuter (*hitchhiking* paket) di mana pengguna dapat memanfaatkan rute perjalanan harian rutin mereka untuk mengantar barang titipan yang searah. 

Proyek ini dirancang untuk dijalankan sepenuhnya pada **Satu Laptop (Single-Device Sandbox Development)** menggunakan interaksi lintas tab browser secara *real-time* tanpa memerlukan *backend* fisik/database eksternal.

---

## 🚀 Cara Menjalankan Proyek

### Prasyarat
- **Node.js** (Versi 20.19.0+ atau 22.12.0+ direkomendasikan. Aplikasi ini telah disesuaikan agar dapat berjalan pada Node.js versi lama seperti `22.4.1` menggunakan Vite 6).
- **NPM** (Bawaan Node.js).

### Langkah Instalasi & Menjalankan
1. Buka terminal/PowerShell di direktori proyek:
   ```bash
   npm install
   ```
   *(Catatan: Jika program `npm` tidak ditemukan di Windows, pastikan instalasi Node.js ada di PATH Anda atau jalankan via jalur absolut seperti `& "C:\Program Files\nodejs\npm.cmd" install`)*

2. Jalankan server pengembangan lokal (Vite):
   ```bash
   npm run dev
   ```

3. Buka peramban (browser) dan akses alamat yang tertera di terminal, biasanya:
   **[http://localhost:5173/](http://localhost:5173/)**

---

## 📱 Cara Penggunaan & Pengujian Sandbox Multi-Tab

Aplikasi ini tidak memiliki database terpusat, melainkan memanfaatkan **LocalStorage** yang disinkronkan menggunakan event penyimpanan browser. Untuk menyimulasikan interaksi nyata antar aktor, silakan buka **dua atau lebih jendela browser secara berdampingan (Split-Screen)** dengan parameter URL peran (*role*) yang berbeda:

1. **Tab Pengirim (Sender)**: Akses dengan query `?role=pengirim`
   - Buka `http://localhost:5173/?role=pengirim`
   - Berfungsi untuk mengirim paket baru, menentukan titik jemput/antar lewat peta, mengisi detail barang, dan memantau status pengiriman secara langsung.

2. **Tab Driver**: Akses dengan query `?role=driver`
   - Buka `http://localhost:5173/?role=driver`
   - Berfungsi untuk mengatur rute harian driver, melihat kecocokan paket searah (rute langsung & detour simpangan), mengambil paket, dan memandu pengantaran turn-by-turn.

3. **Tab Admin**: Akses dengan query `?role=admin`
   - Buka `http://localhost:5173/?role=admin`
   - Berfungsi untuk memantau omset, mengelola seluruh pengguna (termasuk mengatur lokasi koordinat fisik mereka via peta), dan memodifikasi status/driver dari paket-paket aktif.

*💡 Jika Anda menguji dalam satu tab saja, sistem memiliki **Simulator Driver Virtual** yang akan otomatis mengambil paket Anda (status "Mencari Driver") dalam waktu 7 detik menggunakan pengemudi acak dari database.*

---

## 🛠️ Arsitektur & Cara Kerja Sistem

Aplikasi ini bekerja menggunakan kombinasi teknologi *client-side* murni yang dinamis:

### 1. Sinkronisasi Data Lintas Tab (Mock Backend)
Seluruh data aplikasi (User, Paket, Rute, Pesan Chat) disimpan di dalam `localStorage`. 
- Saat salah satu tab melakukan perubahan data (misal: Driver mengklik "Ambil Paket"), tab tersebut akan memancarkan event `storage_update` secara lokal dan memicu penyimpanan browser.
- Tab lain yang sedang aktif mendengarkan event `'storage'` dan `'storage_update'` via fungsi `subscribeToStorage`. Tab-tab tersebut akan mendeteksi perubahan data dan langsung memperbarui tampilan antarmuka (UI) secara otomatis dan instan tanpa perlu memuat ulang halaman (*reload*).

### 2. Sistem Pencocokan Rute & Detour (Detour Math)
- Ketika pengirim mempublikasikan koordinat penjemputan (P) dan pengantaran (D), dan driver mengaktifkan rute hariannya (W1 → W2 → ... → Wn), sistem akan menghitung kombinasi indeks penyisipan optimal untuk memasukkan P dan D ke dalam rute pengemudi.
- Aplikasi menggunakan formula matematika **Haversine** (di [matching.ts](src/lib/matching.ts)) untuk menghitung jarak geografis antar titik koordinat dan mengevaluasi jarak simpangan (*detour distance*). Jika penambahan rute jemput-antar kurang dari batas toleransi km (misal 3.0 km), paket dinyatakan **searah** dan ditampilkan ke dashboard driver.

### 3. Peta Navigasi & Rute Jalan Riil (OSRM API & Geolocation)
- Peta menggunakan pustaka **Leaflet.js** dengan tile layer **CartoDB Positron** yang dikustomisasi dengan gaya abu-abu (*grayscale*) minimalis untuk mengurangi kepadatan visual.
- Integrasi **HTML5 Geolocation API** (`watchPosition`) melacak posisi fisik laptop secara real-time dan menggambarkan indikator GPS biru yang berkedip dengan animasi gelombang (*ripple*).
- Ketika rute aktif ditampilkan, aplikasi mengirimkan koordinat titik-titik tersebut ke **OSRM (Open Source Routing Machine) API** publik untuk mengambil garis jalanan asli (*routed path geometry*), bukan garis lurus.
- API OSRM juga mengembalikan petunjuk manuver jalan (*turn-by-turn directions*). Petunjuk ini ditampilkan pada **HUD Navigasi Melayang** bergaya Google Maps di atas peta, lengkap dengan jarak dan tombol pengontrol untuk menyimulasikan perpindahan instruksi langkah-demi-langkah.

---

## 📁 Struktur Berkas Proyek

Berikut adalah tata letak berkas-berkas utama di dalam folder `src`:

```text
src/
├── app/
│   ├── components/
│   │   ├── BottomNav.tsx          # Navigasi bawah ponsel (disesuaikan untuk Pengirim, Driver, Admin)
│   │   ├── BuktiKameraMock.tsx    # Simulator kamera ponsel untuk mengambil foto penyerahan barang
│   │   ├── MapPlaceholder.tsx     # Komponen peta Leaflet utama (Grayscale, GPS, OSRM Routing, Nav HUD)
│   │   └── PackageCard.tsx        # Tampilan kartu paket serbaguna
│   │
│   └── screens/
│       ├── Homepage.tsx           # Halaman beranda utama dengan ringkasan peran aktif
│       ├── admin/
│       │   └── AdminPanel.tsx     # Panel Admin (Stats omset, Manajemen User via Peta, Manajemen Order)
│       ├── auth/
│       │   ├── AuthLogin.tsx      # Login sandbox (mencari email di user registry local storage)
│       │   └── AuthSignup.tsx     # Signup sandbox (menyimpan ke user registry local storage)
│       ├── bersama/
│       │   ├── LiveChat.tsx       # Chat real-time antara Pengirim & Driver pada paket aktif
│       │   └── SetelanAkun.tsx    # Halaman profil, ganti peran (Pengirim/Driver/Admin) & reset sandbox
│       ├── driver/
│       │   ├── Angkut.tsx         # Input parameter rute harian driver dan kapasitas bagasi
│       │   ├── AngkutDash.tsx     # Dashboard driver (Peta collapsible 2/3 ke 1/3, matching, rerouting)
│       │   ├── AngkutProses.tsx   # Halaman jalannya delivery (konfirmasi jemput, foto bukti serah terima)
│       │   └── AngkutRiwayat.tsx  # Catatan riwayat pengantaran driver
│       └── pengirim/
│           ├── KirimDash.tsx      # Dashboard pemantauan status paket aktif pengirim
│           ├── KirimDetail.tsx    # Form input kategori barang, foto, dimensi, dan instruksi penanganan
│           ├── KirimPesan.tsx     # Review biaya & konfirmasi pemesanan
│           └── KirimRute.tsx      # Penentuan lokasi jemput/antar via input preset & map pointer
│
├── lib/
│   ├── matching.ts                # Algoritma Haversine & evaluasi detour penyisipan rute
│   ├── mockData.ts                # Data awal untuk preset lokasi & ukuran paket
│   └── storage.ts                 # Registry data localStorage, subscriber, & database seed pengguna
│
├── styles/
│   ├── fonts.css                  # Pengaturan tipografi proyek
│   └── theme.css                  # Sistem CSS global (variabel warna, flex shell, style kartu premium)
│
├── App.tsx                        # Router utama aplikasi, URL parameter override, & simulator driver background
└── main.tsx                       # Entry point aplikasi React
```