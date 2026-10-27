# VLT — Velgryn Learning Tracking

> Aplikasi personal terpadu untuk **Plan** (Roadmap Course & Jadwal), **Execute** (Focus Room Pomodoro), dan **Track** (Data Progres Nyata).

Aplikasi web personal berbasis React, TypeScript, dan Vite yang dibangun berdasarkan dokumen arsitektur dan persyaratan produk **PRD VLT v1.0**.

---

## 🚀 Status Rilis: Tahap 1 — Fondasi UI

- [x] Kerangka aplikasi React 19 + TypeScript + Vite (tanpa nesting).
- [x] Sistem styling Vanilla CSS terkurasi dengan dukungan penuh **Light Theme & Dark Theme** (menggunakan CSS variables & localStorage persistence).
- [x] Struktur navigasi responsif:
  - **Desktop**: Collapsible Sidebar yang elegan dengan status aktif dan indikator mode single-user.
  - **Mobile**: Top Header ringkas dan Bottom Navigation Bar yang mudah dijangkau.
- [x] Kerangka awal 6 modul utama:
  1. **Dashboard** (`FR-DASH`): Widget ringkasan prioritas harian, jadwal & deadline terdekat, progres roadmap, dan akses instan ke Focus Room.
  2. **My Learning** (`FR-LEARN`): Ketentuan format impor JSON v1.0, aturan Preview & Merge diff, dan daftar course.
  3. **Calendar** (`FR-CAL`): Kalender visual dengan pemisahan tegas antara Jadwal (Rencana) vs Target Deadline vs Realisasi Aktivitas.
  4. **Focus Room** (`FR-FOCUS`): Timer Pomodoro interaktif (Fokus 25m / Istirahat 5m), live session counter, serta panduan arsitektur multi-perangkat.
  5. **Analytics** (`FR-ANA`): Ringkasan metrik konsistensi yang mengikuti prinsip **FR-ANA-04 (Zero Fake Data)**.
  6. **Settings** (`FR-SET`): Preferensi tema (Light/Dark/System), kustomisasi durasi timer, dan status tahapan MVP.
- [x] Belum ada dependensi database/Supabase atau data palsu (sesuai batasan Tahap 1).

---

## 🛠️ Cara Menjalankan Proyek Secara Lokal

### Prasyarat
- Node.js (v18.0.0 atau lebih baru)
- npm

### 1. Instalasi Dependensi
```bash
npm install
```

### 2. Menjalankan Server Pengembangan (Dev)
```bash
npm run dev
```
Aplikasi akan aktif di `http://localhost:5173/` (atau port default Vite lainnya).

### 3. Membangun Bundle Produksi (Build)
```bash
npm run build
```

---

## 📂 Struktur Folder

```text
├── public/                 # Aset statis & favicon
├── src/
│   ├── components/
│   │   ├── common/         # Komponen UI reusable (Card, Badge, EmptyState)
│   │   └── layout/         # Layout responsif (Sidebar, Header, MobileNav, AppLayout)
│   ├── context/            # Context state (ThemeContext untuk Light/Dark theme)
│   ├── pages/              # 6 halaman modul (Dashboard, Learning, Calendar, Focus, Analytics, Settings)
│   ├── types/              # Definisi TypeScript domain VLT
│   ├── App.tsx             # Root component & page switcher
│   ├── index.css           # Design system tokens & global styling
│   └── main.tsx            # Entry point React
├── index.html              # HTML template & Google Fonts (Inter)
├── package.json            # Dependensi proyek
├── tsconfig.json           # Konfigurasi TypeScript
└── vite.config.ts          # Konfigurasi Vite
```

---

## 📋 Tahap Berikutnya (PRD v1.0)
- **Tahap 2**: Learning Management (Parser JSON Roadmap v1.0, Preview & Merge diff engine, pengelolaan status lesson).
- **Tahap 3**: Planning (Kalender interaktif, jadwal multi-lesson, algoritma skor prioritas harian deterministik).
- **Tahap 4**: Focus Tracking & Timer Recovery (Integrasi checkpoint, heartbeat multi-perangkat).
- **Tahap 5**: Analytics & Stabilitas (Visualisasi chart data aktual, ekspor/backup JSON).
