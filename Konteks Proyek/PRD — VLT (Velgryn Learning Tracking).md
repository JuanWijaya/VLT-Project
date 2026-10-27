# PRD — VLT (Velgryn Learning Tracking)

Product Requirements Document | Versi 1.0 | Disusun berdasarkan Product Brief VLT v2.0 | Status produk: Konsep, belum masuk tahap implementasi

## 1. Ringkasan Eksekutif

VLT (Velgryn Learning Tracking) adalah aplikasi web personal yang menggabungkan tiga aktivitas belajar dalam satu alur: **Plan** (mengelola course, lesson, jadwal, deadline, prioritas), **Execute** (menjalankan sesi fokus Pomodoro dan mencatat aktivitas), dan **Track** (memantau progres dan konsistensi belajar berdasarkan data aktual). Prinsip inti produk adalah memisahkan secara tegas antara rencana, pelaksanaan, dan hasil, sehingga pengguna selalu tahu apa yang direncanakan versus apa yang benar-benar dikerjakan.

Versi awal (MVP) ditujukan untuk satu pengguna (self-use), berbasis web, responsif di desktop dan mobile, dengan login wajib dan tanpa registrasi publik.

## 2. Latar Belakang & Masalah

Pengguna yang belajar mandiri sering kesulitan menjawab tiga pertanyaan sekaligus: apa yang harus dikerjakan hari ini, seberapa jauh progres sebenarnya, dan seberapa konsisten pola belajarnya. Alat-alat terpisah (catatan manual, timer Pomodoro generik, to-do list) tidak saling terhubung sehingga data rencana dan realisasi tidak pernah dibandingkan. VLT dibangun untuk menyatukan ketiganya dalam satu sumber data yang konsisten.

## 3. Tujuan Produk

1. Membantu pengguna menentukan prioritas belajar harian.
2. Memudahkan pengelolaan roadmap course dan lesson.
3. Mencatat waktu fokus aktual secara akurat.
4. Menampilkan progres dan tren konsistensi berdasarkan data nyata (bukan asumsi).
5. Menghubungkan jadwal, sesi fokus, dan progres dalam satu aplikasi.
6. Menjaga data belajar tetap tersedia lintas perangkat.

## 4. Target Pengguna

Satu pengguna (personal use) yang ingin mengelola pembelajaran mandiri melalui roadmap, jadwal, sesi fokus, dan evaluasi progres. Bukan platform multi-pengguna atau platform pembelajaran publik pada versi awal.

## 5. Lingkup Produk

### 5.1 In Scope (MVP)

Login personal; Dashboard & prioritas harian; impor roadmap JSON dengan validasi & pratinjau; pengelolaan course/lesson; penggabungan pembaruan roadmap (preview & merge); status lesson & progres course; kalender, jadwal multi-lesson, deadline; Pomodoro dengan pause/resume/stop & pemulihan sesi; riwayat sesi fokus; analytics (waktu fokus, progres, konsistensi); tema terang/gelap; ekspor & backup data; tampilan responsif desktop & mobile.

### 5.2 Out of Scope (versi awal)

- Banyak pengguna dan fitur sosial
- Registrasi publik
- Algoritma rekomendasi berbasis AI
- Gamifikasi kompleks (level, streak dominan)
- Sinkronisasi dua arah otomatis file lokal ↔ website
- Integrasi kalender eksternal
- Analisis produktivitas yang butuh data di luar VLT

Item-item ini dapat dipertimbangkan setelah alur utama stabil.

## 6. Asumsi & Batasan Platform

| Aspek | Ketentuan |
| --- | --- |
| Platform | Web, responsif desktop & mobile |
| Deployment | Vercel (direncanakan) |
| Backend/Auth | Supabase (kandidat utama, belum final) |
| Login | Wajib; registrasi publik tidak tersedia |
| Tema | Terang & gelap |
| Data | Harus punya fitur ekspor & mekanisme backup yang jelas |
| Navigasi | Konsisten antar perangkat, susunan boleh menyesuaikan layar |

## 7. Functional Requirements

### 7.1 Dashboard (FR-DASH)

Halaman utama setelah login; menjawab "apa yang sebaiknya dikerjakan hari ini".

| ID | Requirement | Deskripsi |
| --- | --- | --- |
| FR-DASH-01 | Prioritas harian | Menampilkan daftar prioritas belajar hari ini |
| FR-DASH-02 | Jadwal & deadline terdekat | Menampilkan jadwal dan deadline yang mendekat |
| FR-DASH-03 | Ringkasan progres course | Progres semua course aktif secara ringkas |
| FR-DASH-04 | Ringkasan waktu fokus | Ringkasan waktu fokus terbaru |
| FR-DASH-05 | Akses cepat Focus Room | Tombol/akses langsung ke sesi Pomodoro |
| FR-DASH-06 | Empty state | Kondisi kosong memberi tindakan lanjutan yang jelas |

### 7.2 My Learning — Course & Roadmap (FR-LEARN)

Pengelolaan course dan roadmap lesson.

| ID | Requirement | Deskripsi |
| --- | --- | --- |
| FR-LEARN-01 | Pembuatan course via impor | Course baru **hanya** dibuat melalui impor file JSON, tidak ada form buat-course manual |
| FR-LEARN-02 | Daftar & detail course | Daftar course, detail course, dan roadmap lesson |
| FR-LEARN-03 | Status lesson | Belum dimulai / Sedang dipelajari / Selesai, dapat diubah manual termasuk dikembalikan |
| FR-LEARN-04 | Edit di web | Course & lesson yang sudah ada dapat diedit di website; file sumber tidak otomatis berubah |
| FR-LEARN-05 | Urutan lesson | Lesson dapat diurutkan ulang secara manual |
| FR-LEARN-06 | Progres course | Dihitung otomatis dari jumlah lesson selesai |

**Format impor:** JSON dengan versi skema jelas; memuat identitas course, nama/deskripsi, daftar lesson, ID unik lesson, urutan, referensi belajar (opsional). Validasi struktur, tipe data, field wajib, ID, dan duplikasi dilakukan **sebelum** file diterapkan.

**Impor ulang (preview & merge):** Course/lesson dicocokkan via ID stabil; item baru ditambah setelah konfirmasi; perubahan pada item yang cocok ditampilkan sebelum diterapkan; status lesson & riwayat belajar dipertahankan secara default; item yang hilang dari file tidak otomatis dihapus; konflik/penghapusan/dampak ke data terkait wajib ditinjau pengguna; file invalid tidak boleh mengubah data tersimpan; proses mencegah duplikasi tak disengaja dan mencegah kondisi hanya sebagian perubahan penting tersimpan.

### 7.3 Calendar (FR-CAL)

| ID | Requirement | Deskripsi |
| --- | --- | --- |
| FR-CAL-01 | Jadwal satu aktivitas | Jadwal untuk satu lesson/aktivitas |
| FR-CAL-02 | Jadwal multi-lesson | Satu blok belajar mencakup beberapa lesson |
| FR-CAL-03 | Aktivitas umum | Jadwal tanpa hubungan ke lesson tertentu |
| FR-CAL-04 | Deadline terpisah | Deadline adalah target penyelesaian, disimpan terpisah dari jadwal, bukan otomatis waktu belajar |
| FR-CAL-05 | Rencana vs realisasi | Pembedaan visual yang jelas antara jadwal (rencana) dan riwayat aktivitas aktual |

### 7.4 Focus Room — Pomodoro (FR-FOCUS)

| ID | Requirement | Deskripsi |
| --- | --- | --- |
| FR-FOCUS-01 | Timer Pomodoro | Durasi fokus & istirahat dapat disesuaikan |
| FR-FOCUS-02 | Kontrol sesi | Pause, resume, stop lebih awal |
| FR-FOCUS-03 | Kaitan opsional | Sesi dapat dikaitkan ke course/lesson, atau berdiri sendiri |
| FR-FOCUS-04 | Riwayat sesi | Riwayat sesi fokus tersimpan |
| FR-FOCUS-05 | Pemulihan sesi | Sesi yang terjeda akibat halaman ditinggalkan/tertutup dapat dipulihkan |
| FR-FOCUS-06 | Akurasi waktu | Durasi dihitung dari catatan waktu & status sesi, bukan hanya hitung mundur di layar |

**Aturan tambahan:** waktu istirahat/jeda tidak dihitung fokus; sesi dihentikan lebih awal tetap menyimpan durasi valid yang sudah dijalani; sesi dibatalkan tanpa durasi valid tidak dihitung; status disimpan berkala (tidak hanya bergantung event penutupan); sesi lintas jam/tengah malam dibagi ke jam/tanggal yang sesuai; durasi yang sama tidak dihitung dua kali; jika penutupan mendadak gagal tersimpan, aplikasi memulihkan data terakhir yang aman dan menghindari durasi yang tidak dapat dipercaya.

### 7.5 Analytics (FR-ANA)

| ID | Requirement | Deskripsi |
| --- | --- | --- |
| FR-ANA-01 | Waktu fokus | Total, per hari, distribusi per jam, per course, jumlah sesi valid |
| FR-ANA-02 | Progres belajar | % progres course, jumlah lesson selesai, perubahan progres mingguan |
| FR-ANA-03 | Tren konsistensi | Hari aktif per minggu, pola aktivitas harian, perbandingan antarperiode |
| FR-ANA-04 | Integritas data | Data kosong tidak diganti angka contoh yang seolah nyata; setiap grafik menjelaskan rentang waktu & definisi metrik |

### 7.6 Settings (FR-SET)

| ID | Requirement | Deskripsi |
| --- | --- | --- |
| FR-SET-01 | Tema | Terang & gelap |
| FR-SET-02 | Preferensi Pomodoro | Durasi default fokus/istirahat |
| FR-SET-03 | Akun | Pengaturan akun pengguna |
| FR-SET-04 | Ekspor & backup | Ekspor data dan informasi backup |

## 8. Aturan Bisnis Utama

**Status & progres lesson** — 3 status (Belum dimulai, Sedang dipelajari, Selesai); progres course = (lesson selesai ÷ total lesson) × 100%, semua lesson berbobot sama di MVP; course tanpa lesson menampilkan 0%/status belum tersedia (tidak membagi dengan nol); mengubah status tidak menghapus riwayat sesi; menyelesaikan sesi Pomodoro **tidak** otomatis menyelesaikan lesson.

**Jadwal & deadline** — jadwal menyimpan waktu rencana, study session menyimpan aktivitas aktual; selisih rencana-aktual tidak mengubah jadwal otomatis; selesainya satu jadwal tidak otomatis menandai seluruh lesson terkait selesai.

**Prioritas harian** — dihasilkan dari jadwal hari itu, kedekatan deadline, status lesson, dan relevansi terhadap rencana belajar (aturan sederhana, dapat dijelaskan ke pengguna); lesson selesai tidak muncul sebagai pekerjaan belum selesai; pengguna dapat mengurutkan ulang dan urutan manual dipertahankan; perubahan jadwal/deadline dapat memunculkan rekomendasi baru tapi tidak diam-diam mengacak urutan manual.

**Penghapusan data** — penghapusan course/lesson memerlukan konfirmasi; riwayat sesi fokus tidak dihapus diam-diam saat lesson dihapus; jika lesson yang terhubung ke jadwal/riwayat dihapus, relasi ditangani jelas (mis. referensi historis yang tidak lagi aktif); tidak boleh menimbulkan referensi rusak (broken reference).

## 9. Model Data Konseptual

| Entitas | Deskripsi | Relasi Utama |
| --- | --- | --- |
| Course | Identitas & info course | 1 course → banyak lesson |
| Lesson | Bagian course: urutan, status, referensi | Bisa punya banyak study session |
| Schedule | Rencana aktivitas pada waktu tertentu | Bisa terhubung ke satu/beberapa lesson |
| Deadline | Target penyelesaian course/lesson | Terkait course atau lesson |
| Study Session | Waktu fokus aktual, status timer, konteks | Terkait lesson atau berdiri sendiri (aktivitas umum) |
| User Preferences | Tema, preferensi timer, dll | Milik pengguna |

Riwayat aktivitas dipertahankan ketika struktur course diubah. Model ini bersifat konseptual, bukan skema database final.

## 10. Non-Functional Requirements

| Kategori | Requirement |
| --- | --- |
| Keamanan | Autentikasi wajib; aturan akses (row-level) pada setiap tabel data personal; kunci rahasia hanya di server/environment variables, tidak diekspos di frontend; akses minimum sesuai kebutuhan tiap bagian aplikasi |
| Keandalan data | Ekspor data & prosedur backup tersedia; proses pemulihan diuji sebelum diandalkan; lingkungan dev dipisah dari data produksi bila memungkinkan |
| Aksesibilitas | Informasi penting tidak hanya dibedakan lewat warna — disertai label/ikon |
| Pengalaman pengguna | Kondisi kosong, loading, error, dan sukses dirancang eksplisit; perubahan data penting butuh konfirmasi; analytics tidak "menghakimi" hari istirahat secara negatif |
| Konsistensi lintas platform | Fungsi utama sama di desktop & mobile, navigasi boleh menyesuaikan layar |

## 11. MVP & Tahapan Rilis

| Tahap | Fokus |
| --- | --- |
| 1 — Fondasi | Autentikasi, penyimpanan data, struktur halaman, tema |
| 2 — Learning Management | Impor roadmap, pengelolaan course/lesson, status, progres |
| 3 — Planning | Kalender, jadwal, deadline, prioritas harian |
| 4 — Focus Tracking | Pomodoro, pemulihan sesi, riwayat fokus |
| 5 — Analytics & Stabilitas | Grafik, validasi perhitungan, ekspor, backup, uji keamanan, responsivitas |

Urutan ini adalah rekomendasi, bukan kewajiban menyelesaikan seluruh fitur satu tahap sebelum iterasi ke tahap lain.

## 12. Kriteria Penerimaan MVP

- File roadmap valid dapat diimpor; file invalid ditolak tanpa mengubah data.
- Impor ulang tidak menduplikasi course/lesson yang cocok.
- Pembaruan roadmap menampilkan perbedaan (diff) sebelum diterapkan.
- Progres & riwayat sesi tetap terjaga ketika course diedit.
- Pengguna dapat membuat jadwal satu aktivitas maupun jadwal multi-lesson.
- Deadline tidak otomatis menjadi jadwal belajar.
- Timer menyimpan durasi fokus aktual dan tidak menghitung waktu jeda.
- Sesi yang dipulihkan setelah browser ditutup tidak menghitung waktu saat dijeda.
- Prioritas harian dapat diatur ulang oleh pengguna.
- Analytics sesuai dengan data sesi & status lesson yang tersimpan.
- Data pribadi terlindungi autentikasi & aturan akses.
- Fitur utama dapat digunakan di desktop maupun mobile.
- Pengguna dapat mengekspor data untuk backup.

## 13. Prinsip Keputusan Produk

Saat muncul pilihan desain/teknis baru, prioritas pengambilan keputusan:

1. Mencegah kehilangan atau kerusakan data.
2. Menjaga perhitungan aktivitas tetap akurat.
3. Memudahkan penggunaan harian.
4. Mempertahankan kendali pengguna.
5. Mengurangi kompleksitas yang belum diperlukan.
6. Memudahkan pengujian dan pemeliharaan aplikasi.

## 14. Keputusan Teknis yang Dilengkapi (QA, Prioritas Harian, Pomodoro Multi-Perangkat, Skema JSON)

Empat area berikut sebelumnya ditandai sebagai belum ditentukan pada draf awal PRD ini. Bagian ini melengkapinya dengan business rules, kriteria penerimaan yang dapat diuji, edge case, dan keputusan yang masih perlu dikonfirmasi, tanpa mengubah keputusan produk yang sudah disepakati pada bagian-bagian sebelumnya. Seluruh angka target QA dan bobot prioritas di bawah ini adalah nilai awal yang perlu dievaluasi lewat pengujian nyata, bukan klaim bahwa sistem sudah mengukur atau memenuhinya — implementasi dan pengujian belum dimulai.

### 14.1 Target Metrik QA

Target berikut adalah nilai awal yang dapat diuji (testable), bukan klaim bahwa sistem saat ini sudah mencapainya. Target dibedakan menurut empat skenario: **normal**, **pemulihan setelah aplikasi ditutup**, **koneksi terputus**, dan **perangkat tidur (sleep)**.

| Kategori | Target Awal | Skenario |
| --- | --- | --- |
| Akurasi timer | Selisih durasi tercatat vs waktu referensi server ≤ 1 detik per 5 menit sesi berjalan | Normal |
| Pemulihan sesi — aplikasi ditutup wajar (tab ditutup, dibuka lagi < 5 menit) | 100% sesi pulih sebagai "dijeda" dengan durasi tersimpan akurat ±1 detik dari checkpoint terakhir | Pemulihan setelah ditutup |
| Pemulihan sesi — force-close / crash | ≥ 95% sesi dapat dipulihkan dari checkpoint terakhir (checkpoint tersimpan ≤ 15 detik sekali) | Pemulihan setelah ditutup |
| Pemulihan sesi — koneksi terputus | Timer lokal tetap berjalan offline; setelah koneksi pulih, sinkronisasi ke server ≤ 5 detik tanpa durasi terhitung dua kali | Koneksi terputus |
| Pemulihan sesi — perangkat tidur | Durasi selama perangkat tidur tidak dihitung sebagai fokus; sesi otomatis ditandai "dijeda" jika jeda antar-checkpoint melebihi ambang batas (lihat Keputusan Terbuka) | Perangkat tidur |
| Integritas impor | 100% file dengan field wajib hilang atau ID duplikat ditolak sebelum data tersimpan berubah; 0% kehilangan status lesson/riwayat pada impor ulang yang valid | Normal |
| Konsistensi penyimpanan | 0% kejadian durasi sesi terhitung dua kali pada percobaan impor ulang berulang; 0% referensi rusak (broken reference) setelah rangkaian operasi hapus/edit berturutan | Normal |
| Performa halaman — LCP | ≤ 2,5 detik (persentil ke-75) | Normal |
| Performa halaman — INP | ≤ 200 ms (persentil ke-75) | Normal |
| Performa halaman — CLS | ≤ 0,1 | Normal |

**Acceptance criteria:**

- Pada serangkaian sesi Pomodoro 25 menit di jaringan stabil, rata-rata deviasi durasi tercatat terhadap waktu referensi server ≤ 1 detik per 5 menit.
- Pada simulasi force-close (proses dimatikan tanpa event beforeunload), ≥ 95% percobaan menunjukkan sesi pulih sebagai "dijeda" dengan durasi terakhir yang valid.
- Pada percobaan impor file JSON dengan field wajib sengaja dihilangkan, 100% ditolak tanpa mengubah data tersimpan.
- Pada pengukuran Core Web Vitals di halaman Dashboard, Focus Room, dan Analytics, persentil ke-75 LCP ≤ 2,5 detik, INP ≤ 200 ms, CLS ≤ 0,1.

**Edge case:**

- Jam sistem perangkat diubah manual saat sesi berjalan — durasi tetap dihitung dari selisih timestamp server, bukan jam klien.
- Tab dibiarkan di background lama sebelum browser benar-benar men-suspend proses.
- Halaman di-reload di tengah sesi tanpa menutup tab.
- Koneksi terputus lebih lama dari masa retensi checkpoint lokal.

**Keputusan yang masih perlu dikonfirmasi:**

- Interval checkpoint penyimpanan status sesi (usulan awal 10–15 detik) — perlu ditimbang trade-off antara akurasi dan jumlah penulisan ke database.
- Metode deteksi "perangkat tidur" secara teknis (Page Visibility API saja tidak cukup) — perlu eksplorasi teknis terpisah di luar PRD ini.
- Tool dan environment pengukuran performa resmi (mis. Lighthouse CI vs Vercel Analytics, produksi vs staging).
- Frekuensi pengujian QA berkelanjutan (sekali per rilis vs otomatis lewat CI).

### 14.2 Logika Prioritas Harian

Rumus skor berikut bersifat deterministik dan menggantikan deskripsi "aturan sederhana" pada Bagian 9 dengan definisi yang dapat diimplementasikan dan diuji.

```
Skor(item) = Skor_Deadline + Skor_JadwalHariIni + Skor_StatusLesson + Skor_BelumBerjadwal
```

| Komponen | Rentang | Definisi awal |
| --- | --- | --- |
| Skor\_Deadline | 0–40 | Proporsional terhadap kedekatan deadline dalam jendela 7 hari: 40 × max(0, (7 − hari\_tersisa) / 7), dibatasi 0–40; deadline yang sudah lewat (overdue) = 40 (maksimum); tanpa deadline = 0 |
| Skor\_JadwalHariIni | 0 atau 30 | 30 jika lesson/aktivitas dijadwalkan hari ini, 0 jika tidak |
| Skor\_StatusLesson | 0–20 | "Sedang dipelajari" = 20, "Belum dimulai" = 10, "Selesai" = dikecualikan sepenuhnya dari daftar (lihat business rules) |
| Skor\_BelumBerjadwal | 0 atau 10 | 10 jika lesson belum punya jadwal maupun deadline sama sekali, 0 jika sudah |

Skor total maksimum = 100.

**Business rules:**

- Lesson berstatus "Selesai" dikecualikan sepenuhnya dari daftar prioritas — skor tidak dihitung dan lesson tidak ditampilkan sebagai pekerjaan belum selesai, konsisten dengan keputusan yang sudah disepakati di Bagian 9.
- Pemecah skor seri (tie-breaker), diterapkan berurutan sampai seri terpecah: (1) deadline lebih dekat/lebih lewat menang, (2) item dengan jadwal hari ini menang, (3) item yang terakhir diubah (updated\_at) lebih baru menang, (4) urutan alfabetis judul lesson sebagai fallback terakhir agar urutan tetap stabil antar-reload.
- Urutan manual pengguna disimpan sebagai field terpisah (urutan manual), independen dari skor otomatis.
- Skor/urutan otomatis hanya menjadi urutan default sebelum pengguna pernah mengatur ulang untuk daftar tersebut; begitu pengguna mengatur ulang secara manual, urutan itu dipertahankan dan tidak dihitung ulang dari skor pada kunjungan berikutnya.
- Item baru yang muncul setelah urutan manual ditetapkan (jadwal/deadline baru) disisipkan tanpa mengubah posisi relatif item yang sudah diurutkan manual — ditambahkan di akhir, atau di antara item yang belum diurutkan manual berdasarkan skor.
- Perubahan skor karena waktu berjalan (deadline makin dekat) dapat memperbarui badge urgensi yang ditampilkan, tetapi tidak pernah mengubah urutan manual yang sudah ditetapkan.

**Acceptance criteria:**

- Lesson berstatus "Selesai" tidak pernah muncul di daftar prioritas harian, berapa pun skornya.
- Dua item dengan skor total sama namun deadline berbeda (besok vs minggu depan) — item dengan deadline lebih dekat tampil lebih dulu.
- Setelah pengguna menyeret-urutkan ulang daftar secara manual, memuat ulang halaman menampilkan urutan yang identik.
- Menambah jadwal baru hari ini pada lesson yang sudah berada dalam urutan manual tidak mengubah posisinya dalam daftar.
- Lesson baru yang mendapat deadline hari ini setelah urutan manual ditetapkan muncul ditambahkan tanpa menggeser posisi item yang sudah diurutkan.

**Edge case:**

- Lesson tanpa deadline dan tanpa jadwal sama sekali tetap muncul di daftar (skor rendah dari Skor\_BelumBerjadwal + Skor\_StatusLesson saja), agar tidak terlupakan.
- Seluruh item berskor 0 — Dashboard menampilkan empty state yang menjelaskan kondisi, bukan daftar kosong tanpa keterangan.
- Lesson yatim (course-nya sudah dihapus namun lesson masih berjadwal hari ini) — ditangani mengikuti aturan referensi historis di Bagian 14.4.
- Deadline yang sudah lewat jauh (berbulan-bulan) tetap mendapat skor maksimum 40 dan berpotensi mendominasi daftar.

**Keputusan yang masih perlu dikonfirmasi:**

- Jendela 7 hari pada Skor\_Deadline adalah usulan awal, perlu divalidasi dengan pola belajar pengguna nyata.
- Penanganan deadline yang sangat usang ("stale overdue") — apakah skor tetap 40 selamanya atau perlu mekanisme peluruhan agar tidak mendominasi daftar.
- "Relevansi terhadap rencana belajar" yang disebut pada brief awal belum punya rumus tersendiri — apakah digabung ke Skor\_StatusLesson atau menjadi komponen kelima terpisah di versi berikutnya.
- Apakah skor dihitung ulang penuh setiap Dashboard dibuka, atau disimpan sebagai snapshot harian.

### 14.3 Sesi Pomodoro Multi-Perangkat

**Business rules:**

- Satu akun hanya boleh memiliki satu sesi fokus aktif pada satu waktu; status "berjalan" maupun "dijeda" sama-sama dihitung sebagai sesi aktif.
- Status sesi yang tersimpan di server adalah satu-satunya sumber kebenaran (source of truth); timer di perangkat hanyalah tampilan dari status server, bukan sumber hitung independen.
- Perangkat kedua yang dibuka saat sudah ada sesi aktif di server WAJIB menampilkan sesi yang sedang berjalan tersebut (sisa waktu, status), bukan menawarkan untuk memulai sesi baru.
- Permintaan memulai sesi baru dari perangkat mana pun selalu diperiksa ke server terlebih dahulu; jika sudah ada sesi aktif, permintaan ditolak dan pengguna diarahkan ke sesi yang sudah berjalan.
- Jika dua perangkat mengirim permintaan "mulai sesi" hampir bersamaan, server memutuskan berdasarkan permintaan yang diterima pertama (first-write-wins); permintaan kedua menerima respons bahwa sesi sudah ada, bukan membuat sesi duplikat.
- Sistem TIDAK berasumsi browser selalu dapat mendeteksi penutupan tab/aplikasi secara sempurna (event beforeunload/visibilitychange dapat gagal terpicu, misalnya pada force-quit OS atau mati listrik). Kebenaran status "aktif" tidak boleh bergantung semata pada event tersebut.
- Server menandai sesi sebagai "mungkin tidak aktif" apabila tidak menerima heartbeat/checkpoint dari client dalam jangka waktu tertentu (lihat Keputusan Terbuka), bukan menunggu event penutupan eksplisit.
- Keputusan yang sudah disepakati sebelumnya tetap dipertahankan: ketika aplikasi dibuka kembali dan sesi sebelumnya tidak lagi dapat dipastikan masih aktif (tidak ada heartbeat terbaru), aplikasi memulihkan sesi tersebut sebagai "dijeda", bukan otomatis melanjutkan sebagai "berjalan". Aturan multi-perangkat di atas dibangun di atas keputusan ini, bukan menggantikannya.
- Mengakhiri atau membatalkan sesi dari satu perangkat langsung mengubah status di server; perangkat lain yang sedang menampilkan sesi tersebut diperbarui, baik lewat sinkronisasi real-time (jika tersedia) atau paling lambat saat perangkat tersebut melakukan heartbeat berikutnya.

**Acceptance criteria:**

- Dengan sesi aktif di Perangkat A, membuka Focus Room di Perangkat B menampilkan sesi yang sama (durasi berjalan, status) dalam ≤ 5 detik setelah halaman dimuat, bukan layar "mulai sesi baru".
- Mengirim permintaan "mulai sesi" dari Perangkat A dan B secara bersamaan (selisih < 1 detik) menghasilkan tepat satu sesi aktif di server; permintaan yang kalah menerima pesan bahwa sesi sudah berjalan.
- Menghentikan sesi dari Perangkat A membuat Perangkat B tidak lagi bisa mengirim aksi pause/resume ke sesi lama tersebut.
- Jika tidak ada heartbeat dari client melewati ambang batas yang ditentukan, sesi ditandai "mungkin tidak aktif" di server; saat aplikasi dibuka kembali, sesi ditampilkan sebagai "dijeda", bukan "berjalan".

**Edge case:**

- Perangkat A menutup browser tanpa sempat mengirim event apa pun (mati listrik, force-quit); Perangkat B dibuka 10 menit kemudian — sesi harus tampil "dijeda" dengan durasi sampai checkpoint valid terakhir, bukan "berjalan" dengan durasi yang terus menghitung waktu yang sebenarnya tidak terjadi.
- Koneksi internet Perangkat A terputus namun tab tetap terbuka — dibedakan dari penutupan aplikasi; client menyimpan status lokal dan mencoba sinkron ulang begitu koneksi pulih, tanpa menganggap sesi hilang.
- Beberapa tab terbuka di perangkat yang sama dihitung sebagai satu "perangkat" logis selama menggunakan akun yang sama; tab-tab tersebut merefleksikan sesi server yang sama, bukan dianggap dua perangkat berbeda.
- Jam sistem Perangkat A dan B berbeda (clock skew) — perhitungan durasi berbasis timestamp server, bukan jam lokal masing-masing perangkat.

**Keputusan yang masih perlu dikonfirmasi:**

- Interval heartbeat/checkpoint client ke server dan ambang batas "mungkin tidak aktif" (usulan awal: checkpoint tiap 10–15 detik, ambang batas 2× interval).
- Mekanisme notifikasi antar perangkat — real-time (mis. Supabase Realtime) vs polling berkala saat Focus Room dibuka; keputusan arsitektur ini didelegasikan ke tahap desain teknis, bukan diputuskan di PRD ini.
- Apakah pengguna perlu opsi eksplisit untuk "ambil alih" sesi dari perangkat lain yang sudah tidak dapat diakses, dan bagaimana alur konfirmasinya.

### 14.4 Versi Skema JSON Roadmap

**Business rules:**

- Setiap file roadmap WAJIB menyertakan field `schemaVersion` (string, mis. "1.0").
- Versi skema awal yang didukung pada rilis MVP: `schemaVersion` = "1.0".
- Kebijakan validasi menurut versi:
  - Versi didukung ("1.0") → divalidasi & diproses normal sesuai aturan struktur, tipe data, field wajib, ID, dan duplikasi yang sudah ada.
  - Versi lama yang sudah tidak didukung langsung → file ditolak dengan pesan jelas yang mengarahkan ke proses migrasi (lihat di bawah); tidak diproses sebagian.
  - Versi lebih baru dari yang dikenali aplikasi → file ditolak dengan pesan bahwa versi file lebih baru dari yang didukung aplikasi saat ini; data tersimpan tidak berubah.
  - File tanpa field `schemaVersion` sama sekali → diperlakukan sebagai file tidak valid dan ditolak, tidak diasumsikan sebagai versi tertentu.
- Migrasi versi lama dilakukan secara eksplisit, bukan otomatis diam-diam: pengguna diberi tahu file menggunakan versi lama, dan migrasi ke versi yang didukung ditampilkan sebagai langkah terpisah dengan pratinjau sebelum diterapkan, mengikuti mekanisme preview & merge yang sudah ada pada Bagian 7.2.
- ID course dan lesson harus stabil lintas versi skema — migrasi antar versi TIDAK boleh mengubah ID yang sudah ada, karena ID inilah kunci pencocokan saat impor ulang.
- Perilaku impor ulang (menguatkan aturan preview & merge yang sudah ada):
  - Lesson yang ID-nya cocok dengan file baru → diperbarui sesuai hasil preview & merge yang dikonfirmasi pengguna; status lesson & riwayat sesi dipertahankan secara default.
  - Lesson yang ada di data tersimpan namun tidak ada lagi di file baru, DAN sudah memiliki data terkait (status bukan "Belum dimulai", riwayat sesi fokus, atau jadwal/deadline terhubung) → TIDAK dihapus otomatis; ditandai "tidak ada di file sumber" dan ditampilkan sebagai keputusan eksplisit yang harus dikonfirmasi pengguna.
  - Lesson yang hilang dari file baru namun tidak memiliki data terkait sama sekali → tetap ditampilkan dalam ringkasan pratinjau, namun default-nya tetap tidak dihapus otomatis, konsisten dengan prinsip keputusan produk #1 (mencegah kehilangan data) di Bagian 13.
  - Pencocokan impor ulang HANYA berdasarkan ID stabil, bukan nama lesson/course (nama dapat berubah tanpa membuat entitas baru).

**Acceptance criteria:**

- File JSON tanpa field `schemaVersion` ditolak dengan pesan error spesifik, dan tidak ada data tersimpan yang berubah.
- File dengan `schemaVersion` "1.0" yang valid secara struktur berhasil diimpor sepenuhnya.
- File dengan `schemaVersion` yang lebih baru dari yang didukung aplikasi ditolak dengan pesan bahwa versi file lebih baru, data tersimpan tidak berubah.
- Impor ulang file yang menghilangkan ID sebuah lesson yang memiliki riwayat sesi fokus tidak menghapus lesson tersebut dari data tersimpan; lesson ditandai perlu ditinjau.
- Mengimpor ulang file yang sama persis dua kali berturut-turut tidak menghasilkan course/lesson duplikat.

**Edge case:**

- File valid secara skema tapi ID lesson di dalamnya bentrok dengan ID course lain milik pengguna yang sama — perlu validasi keunikan ID lintas seluruh data pengguna, bukan hanya dalam satu file.
- Pengguna mengedit lesson di website lalu mengimpor ulang file lama yang belum mencerminkan perubahan tersebut — preview & merge menampilkan ini sebagai konflik yang perlu ditinjau, bukan menimpa diam-diam.
- File besar dengan sebagian ID valid dan sebagian duplikat dalam satu file yang sama — seluruh file ditolak, bukan diterapkan sebagian.
- Course yang seluruh lesson-nya hilang dari file baru, namun course itu sendiri masih ada di file — course tetap ada, lesson lama dengan riwayat tetap dipertahankan sesuai aturan di atas.

**Keputusan yang masih perlu dikonfirmasi:**

- Format penomoran versi pastinya (semver penuh "1.0.0" vs sederhana "1.0") dan apakah aplikasi akan mendukung lebih dari satu versi skema sekaligus di masa depan.
- Rentang dukungan versi lama (berapa versi ke belakang yang terus didukung dengan migrasi otomatis vs yang harus migrasi manual).
- Mekanisme teknis migrasi (dijalankan di client sebelum unggah, atau di server setelah unggah) — ini keputusan arsitektur yang didelegasikan ke tahap desain teknis, bukan diputuskan di PRD ini.
- Tampilan UI pasti untuk status "lesson tidak ada di file sumber, perlu ditinjau" belum dirancang.
