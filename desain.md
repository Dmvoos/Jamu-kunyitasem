# Panduan Desain & UI/UX: Aplikasi Jamu Kunyit Asem

Dokumen ini adalah spesifikasi desain antarmuka (UI) dan pengalaman pengguna (UX) untuk aplikasi web/PWA pencatatan stok dan penjualan Jamu Kunyit Asem rumahan.

---

## 1. Persona & Prinsip Desain
- **Pengguna Utama**: Ibu-ibu & keluarga pelaku usaha UMKM jamu rumahan.
- **Karakteristik**: Menginginkan antarmuka yang sangat bersih, mudah dipahami, tidak membingungkan, dan minim istilah teknis yang rumit.
- **Prinsip Utama**:
  - **Mobile-First & PWA**: Dirancang presisi untuk layar smartphone, nyaman dioperasikan dengan satu tangan.
  - **Large Touch Targets**: Tombol dan elemen interaktif minimal berukuran `44x44px` hingga `48x48px` agar tidak salah pencet.
  - **High Contrast & Readability**: Huruf besar, kontras jelas, dan bahasa Indonesia sehari-hari yang ramah.

---

## 2. Palet Warna & Visual Identity
Terinspirasi dari gaya modern *Productivity Tracker* (soft, rounded, and clean aesthetic):

| Komponen | Nilai Warna / Hex | Kegunaan |
| :--- | :--- | :--- |
| **Primary (Dark Teal/Navy)** | `#1E3E4E` | Header kartu sorotan (Highlight Card), teks utama, active state navigasi |
| **Accent (Soft Orange/Peach)**| `#F9A826` | Tombol aksi utama (CTA), Floating Action Button (FAB), progress bar, badge aktif |
| **Background** | `#F8F9FA` | Latar belakang seluruh halaman (Off-white bersih) |
| **Card Surface** | `#FFFFFF` | Permukaan kartu dengan soft shadow `0px 4px 20px rgba(0, 0, 0, 0.05)` |
| **Input Background** | `#F1F3F5` | Background form input (borderless, berubah aksen orange saat focus) |
| **Warning/Alert** | `#E65100` / `#EF4444` lembut | Indikator stok menipis |

### Tipografi & Bentuk
- **Font Family**: Sans-serif membulat (*Poppins* atau *Nunito*).
  - Heading: **Bold / SemiBold**
  - Body: **Regular / Medium**
- **Border Radius**:
  - Kartu & Container: `20px` (rounded-2xl)
  - Input field & Tombol: `12px` (rounded-xl)
  - Floating Action Button (FAB): Full rounded `9999px` (rounded-full)
- **Icon Style**: Rounded outline icons (Lucide / Phosphor Icons).

---

## 3. Struktur Layout & Halaman

### A. Halaman Beranda / Dashboard
1. **Header Sapaan**:
   - Teks sapaan hangat: *"Halo, Ibu! Mari kelola jamu hari ini."*
   - Ikon kalender / tanggal hari ini.
2. **Highlight Card (Dark Teal `#1E3E4E`)**:
   - Menampilkan ringkasan jamu siap jual atau target produksi minggu ini.
   - Circular progress indicator warna oranye (`#F9A826`).
   - Tombol cepat: *"Lihat Laporan"*.
3. **Section "Ringkasan Hari Ini" (Grid 2x2)**:
   - **Kartu 1**: Sisa Jamu Siap Jual (Total Liter & Estimasi Botol 200ml).
   - **Kartu 2**: Sisa Stok Kemasan (Botol 200ml).
   - **Kartu 3**: Status Bahan Baku (Peringatan warna merah lembut jika kunyit/jahe/gula/asam menipis).
   - **Kartu 4**: Shortcut *"Mulai Masak Jamu"* dengan warna latar soft peach.

---

### B. Halaman Riwayat / Timeline
1. **Top Section**:
   - Date Picker / Horizontal date strip (seperti referensi desain).
   - Tombol *"Filter Riwayat"* dengan warna Accent Orange memanjang.
2. **Timeline Vertikal**:
   - Garis waktu vertikal rapi menghubungkan setiap aktivitas:
     - 🏭 **Produksi**: *"Batch #01 - Hasil 10 Liter"* (Detail bahan terpakai).
     - 🍶 **Penjualan**: *"Terjual 15 Botol (200ml) dari Batch #01"* (Nominal omzet).
     - 💖 **Konsumsi Sendiri**: *"Diberikan ke Keluarga 2 Botol (Batch #01)"*.
   - Setiap kartu aktivitas dibungkus warna putih dengan bayangan lembut.

---

### C. Navigasi Bawah (Bottom Navigation) & FAB
- **Menu Bar**:
  1. 🏠 **Beranda**
  2. 📦 **Stok Bahan**
  3. ➕ **FAB Center** (Tombol bulat oranye menonjol di tengah)
  4. 📜 **Riwayat**
  5. ⚙️ **Pengaturan / Profil**
- **Interaksi FAB**:
  - Saat tombol **(+)** ditekan, muncul *Bottom Sheet / Modal* pop-up dengan 2 tombol besar:
    - 🍳 **Catat Produksi Baru** (Masak Jamu)
    - 🛒 **Catat Penjualan / Pemakaian**

---

### D. Form Input (Bottom Sheet / Modal)

#### 1. Form Produksi Jamu (Masak)
- **Tanggal Produksi**: Default hari ini.
- **Input Penggunaan Bahan**:
  - Kunyit (kg/gram)
  - Jahe (kg/gram)
  - Asam Jawa (kg/gram)
  - Gula Merah (kg/gram)
- **Hasil Bersih**: Input dalam satuan **Liter** (misal: 10 Liter).
- Tombol aksi: *"Simpan Hasil Produksi"* (Orange penuh).
- *Catatan Bisnis*: Stok bahan baku otomatis terpotong saat form ini disimpan.

#### 2. Form Penjualan & Pemakaian Jamu
- **Tipe Transaksi**: Switch / Tab besar `[ Jual Botol 200ml ]` vs `[ Minum Sendiri / Keluarga ]`.
- **Pilih Batch Produksi**:
  - Dropdown yang jelas menampilkan tanggal produksi & sisa stok yang tersedia (rekomendasi otomatis batch tertua / FIFO).
- **Jika Tipe Penjualan**:
  - **Jumlah Botol (200ml)**: Input angka disertai tombol pintas `[ +1 ] [ +5 ] [ +10 ]`.
  - **Harga / Total Tagihan**: Terhitung otomatis jika bertipe Penjualan.
  - *Catatan Bisnis*: Mengurangi sisa liter di Batch (0.2 L per botol) **dan mengurangi stok fisik Botol 200ml**.
- **Jika Tipe Minum Sendiri / Keluarga**:
  - **Volume Diminum (Liter)**: Tombol pintas cepat `[ 1 Gelas (0.2L) ] [ 2 Gelas (0.4L) ] [ 1 Teko (0.5L) ] [ 1.0 Liter ]`.
  - *Catatan Bisnis*: Mengurangi sisa liter di Batch, **TIDAK mengurangi stok botol 200ml** karena diminum langsung menggunakan gelas/cangkir sendiri tanpa kemasan botol.
- Tombol aksi: *"Konfirmasi & Potong Stok"*.

---

## 4. Referensi Visual
File gambar referensi visual telah disimpan di:
`./ui-reference.jpg`
*(Menampilkan gaya kartu Dark Teal dengan circular indicator di kiri, dan timeline bertanggal vertikal di kanan)*.
