# 🌿 Pencatatan Jamu Kunyit Asem

Aplikasi web modern mobile-first untuk pencatatan stok bahan baku, modal belanja, produksi jamu kunyit asem, penjualan botol 200ml, serta konsumsi keluarga dengan visualisasi analisis keuntungan (Profit Chart).

---

## 📁 Struktur Projek

```
jamu-kunyitasem/
│
├── docs/                       # 📁 FOLDER INI YANG DI-HOST DI GITHUB PAGES
│   ├── index.html              # Struktur UI (Mobile-first)
│   ├── css/
│   │   └── style.css           # Styling kustom
│   ├── js/
│   │   ├── app.js              # Entry point (inisialisasi aplikasi & navigasi)
│   │   ├── api.js              # Logika Fetch API (Otomatis switch ke Mock saat di GitHub)
│   │   ├── mock.js             # Data Dummy / LocalStorage (Demo di GitHub Pages)
│   │   └── ui.js               # Logika manipulasi DOM (render kartu, timeline, modal)
│   └── assets/
│       └── icons/              # File ikon SVG
│
├── backend/                    # 📁 FOLDER SERVER (Express & Google Sheets)
│   ├── server.js               # Entry point Express.js
│   ├── routes/
│   │   └── api.js              # Endpoint (/api/stok, /api/produksi, /api/penjualan)
│   └── services/
│       └── sheets.js           # Logika baca/tulis ke Google Sheets
│
├── .env                        # 🔒 Kredensial Google API (Jangan di-push)
├── .gitignore                  # Filter file rahasia
├── package.json                # Dependensi backend
└── README.md                   # Dokumentasi ini
```

---

## 🚀 Cara Menjalankan

### 1. Menjalankan Langsung di Browser (Statis / Demo GitHub Pages)
Buka file `docs/index.html` langsung di browser Anda. Aplikasi secara otomatis menggunakan mode penyimpanan lokal (`mock.js` / LocalStorage) sehingga semua fitur dapat dicoba langsung tanpa perlu server backend.

### 2. Menjalankan Backend Express (Lokal / Server)
```bash
npm install
npm start
```
Akses aplikasi melalui browser di: `http://localhost:3000`

---

## 🌐 Publikasi ke GitHub Pages
1. Push project ke GitHub repository `jamu-kunyitasem`.
2. Buka repository di GitHub -> **Settings** -> **Pages**.
3. Pada bagian **Build and deployment**:
   - Source: **Deploy from a branch**
   - Branch: **main**
   - Folder: **/docs** (Pilih `/docs`)
4. Klik **Save**. Website Anda akan aktif di URL `https://dmvoos.github.io/jamu-kunyitasem/`.
