// server.js - API & Web Server untuk Jamu Kunyit Asem
// Backend lengkap menangani stok, produksi per batch, penjualan/konsumsi, riwayat, dan serve file statis (index.html)

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs-extra');
const path = require('path');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Sajikan folder ini agar bisa langsung diakses lewat browser: http://localhost:3000
app.use(express.static(__dirname));

// ---------- Database File Persistence ----------
const DB_FILE = path.join(__dirname, 'database.json');

const INITIAL_DATA = {
  bahan: [
    { id: 'kunyit', nama: 'Kunyit', satuan: 'gram', stok: 2500, threshold: 500 },
    { id: 'jahe', nama: 'Jahe', satuan: 'gram', stok: 1500, threshold: 300 },
    { id: 'asam', nama: 'Asam Jawa', satuan: 'gram', stok: 1000, threshold: 250 },
    { id: 'gula', nama: 'Gula Merah', satuan: 'gram', stok: 3000, threshold: 500 },
    { id: 'botol', nama: 'Botol 200ml', satuan: 'pcs', stok: 50, threshold: 20 }
  ],
  batches: [
    {
      id: 'BATCH-20261109-01',
      tanggal: '2026-11-09',
      bahan_terpakai: [
        { id: 'kunyit', nama: 'Kunyit', qty: 500, satuan: 'gram' },
        { id: 'jahe', nama: 'Jahe', qty: 250, satuan: 'gram' },
        { id: 'asam', nama: 'Asam Jawa', qty: 200, satuan: 'gram' },
        { id: 'gula', nama: 'Gula Merah', qty: 600, satuan: 'gram' }
      ],
      total_liter: 10,
      sisa_liter: 8.0, // sisa 40 botol
      catatan: 'Masak Jamu Kunyit Asem Segar'
    }
  ],
  transaksi: [
    {
      id: 'TRX-1',
      tanggal: '2026-11-09',
      tipe: 'penjualan',
      batchId: 'BATCH-20261109-01',
      botol: 8,
      liter: 1.6,
      harga_total: 40000,
      keterangan: 'Penjualan ke Tetangga (8 botol)'
    },
    {
      id: 'TRX-2',
      tanggal: '2026-11-09',
      tipe: 'konsumsi',
      batchId: 'BATCH-20261109-01',
      botol: 2,
      liter: 0.4,
      harga_total: 0,
      keterangan: 'Diminum Keluarga Sendiri (2 botol)'
    }
  ],
  riwayat_stok: [
    {
      id: 'LOG-1',
      tanggal: '2026-11-08',
      bahanId: 'kunyit',
      namaBahan: 'Kunyit',
      jumlah: 3000,
      satuan: 'gram',
      catatan: 'Kulakan Pasar Pagi'
    }
  ]
};

if (!fs.existsSync(DB_FILE)) {
  fs.writeJsonSync(DB_FILE, INITIAL_DATA, { spaces: 2 });
}

function readDB() {
  try {
    return fs.readJsonSync(DB_FILE);
  } catch (err) {
    return INITIAL_DATA;
  }
}

function writeDB(data) {
  fs.writeJsonSync(DB_FILE, data, { spaces: 2 });
}

function generateBatchId(dateStr) {
  const day = (dateStr || new Date().toISOString().slice(0, 10)).replace(/-/g, '');
  const db = readDB();
  const sameDay = (db.batches || []).filter(b => b.id.startsWith(`BATCH-${day}`)).length + 1;
  return `BATCH-${day}-${String(sameDay).padStart(2, '0')}`;
}

// ---------- Endpoints ----------

// 1. Dashboard data lengkap
app.get('/api/dashboard', (req, res) => {
  const db = readDB();
  const batches = db.batches || [];
  const bahan = db.bahan || [];

  const totalJamuLiters = batches.reduce((sum, b) => sum + (Number(b.sisa_liter) || 0), 0);
  const botolItem = bahan.find(b => b.id === 'botol');
  const stockBotol = botolItem ? botolItem.stok : 0;

  // Produksi 7 hari terakhir
  const now = new Date();
  const weekAgo = new Date();
  weekAgo.setDate(now.getDate() - 7);

  const weeklyLiters = batches
    .filter(b => new Date(b.tanggal) >= weekAgo)
    .reduce((sum, b) => sum + (Number(b.total_liter) || 0), 0);

  const totalTerjualBotol = (db.transaksi || [])
    .filter(t => t.tipe === 'penjualan')
    .reduce((sum, t) => sum + (Number(t.botol) || 0), 0);

  const totalKonsumsiLiter = (db.transaksi || [])
    .filter(t => t.tipe === 'konsumsi')
    .reduce((sum, t) => sum + (Number(t.liter) || (Number(t.botol) * 0.2) || 0), 0);

  res.json({
    totalJamuLiters: Number(totalJamuLiters.toFixed(2)),
    totalJamuBotolEst: Math.floor(totalJamuLiters / 0.2),
    stockBotol,
    weeklyLiters: Number(weeklyLiters.toFixed(2)),
    totalTerjualBotol,
    totalKonsumsiLiter: Number(totalKonsumsiLiter.toFixed(2)),
    stokBahan: bahan
  });
});

// 2. Daftar semua bahan baku
app.get('/api/bahan', (req, res) => {
  const db = readDB();
  res.json(db.bahan || []);
});

// 3. Tambah Stok Bahan Baku (Pembelian / Kulakan baru)
app.post('/api/tambah-stok', (req, res) => {
  const { id, jumlah, catatan } = req.body;
  const numJumlah = Number(jumlah);

  if (!id || isNaN(numJumlah) || numJumlah <= 0) {
    return res.status(400).json({ error: 'Data bahan dan jumlah tambah tidak valid' });
  }

  const db = readDB();
  const item = (db.bahan || []).find(b => b.id === id);
  if (!item) {
    return res.status(404).json({ error: 'Bahan baku tidak ditemukan' });
  }

  item.stok = (Number(item.stok) || 0) + numJumlah;

  if (!db.riwayat_stok) db.riwayat_stok = [];
  db.riwayat_stok.unshift({
    id: `LOG-${Date.now()}`,
    tanggal: new Date().toISOString().slice(0, 10),
    bahanId: item.id,
    namaBahan: item.nama,
    jumlah: numJumlah,
    satuan: item.satuan,
    catatan: catatan || 'Penambahan Stok'
  });

  writeDB(db);
  res.json({ success: true, message: `Stok ${item.nama} berhasil ditambah sebanyak ${numJumlah} ${item.satuan}`, bahan: item });
});

// 4. Daftar Batch Produksi
app.get('/api/batches', (req, res) => {
  const db = readDB();
  const sorted = [...(db.batches || [])].sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal));
  res.json(sorted);
});

// 5. Catat Produksi Jamu (Batch Baru & Pengurangan Stok Bahan)
app.post('/api/produksi', (req, res) => {
  const { tanggal, bahan, liter, catatan } = req.body;
  // bahan: { jahe, kunyit, asam, gula }
  const totalLiter = Number(liter);

  if (!tanggal || !bahan || isNaN(totalLiter) || totalLiter <= 0) {
    return res.status(400).json({ error: 'Harap lengkapi tanggal dan hasil produksi liter dengan benar' });
  }

  const db = readDB();
  const pemakaian = [
    { id: 'kunyit', nama: 'Kunyit', qty: Number(bahan.kunyit) || 0 },
    { id: 'jahe', nama: 'Jahe', qty: Number(bahan.jahe) || 0 },
    { id: 'asam', nama: 'Asam Jawa', qty: Number(bahan.asam) || 0 },
    { id: 'gula', nama: 'Gula Merah', qty: Number(bahan.gula) || 0 }
  ];

  // Validasi kecukupan stok bahan
  for (const p of pemakaian) {
    if (p.qty > 0) {
      const item = db.bahan.find(b => b.id === p.id);
      if (!item || item.stok < p.qty) {
        return res.status(400).json({
          error: `Stok ${item ? item.nama : p.id} tidak cukup! Stok saat ini: ${item ? item.stok : 0} ${item ? item.satuan : ''}, dibutuhkan: ${p.qty}`
        });
      }
    }
  }

  // Kurangi stok bahan baku
  for (const p of pemakaian) {
    if (p.qty > 0) {
      const item = db.bahan.find(b => b.id === p.id);
      item.stok -= p.qty;
      p.satuan = item.satuan;
    }
  }

  const batchId = generateBatchId(tanggal);
  const newBatch = {
    id: batchId,
    tanggal,
    bahan_terpakai: pemakaian.filter(p => p.qty > 0),
    total_liter: totalLiter,
    sisa_liter: totalLiter,
    catatan: catatan || 'Produksi Jamu Kunyit Asem'
  };

  if (!db.batches) db.batches = [];
  db.batches.unshift(newBatch);

  writeDB(db);
  res.json({ success: true, message: `Batch ${batchId} berhasil dibuat (${totalLiter} Liter)`, batch: newBatch });
});

// 6. Catat Penjualan / Pemakaian Konsumsi Keluarga
app.post('/api/penjualan', (req, res) => {
  const { tanggal, tipe, batchId, botol, liter, hargaTotal, keterangan } = req.body;
  const isJual = tipe === 'penjualan';
  const jumlahBotol = isJual ? parseInt(botol, 10) : 0;
  const literDibutuhkan = isJual
    ? Number(((jumlahBotol || 0) * 0.2).toFixed(2))
    : Number((parseFloat(liter || botol * 0.2) || 0).toFixed(2));

  if (!tanggal || !tipe || !batchId || literDibutuhkan <= 0) {
    return res.status(400).json({ error: 'Data transaksi belum lengkap' });
  }

  const db = readDB();
  const batch = (db.batches || []).find(b => b.id === batchId);
  if (!batch) {
    return res.status(404).json({ error: 'Batch produksi tidak ditemukan' });
  }

  if (batch.sisa_liter < literDibutuhkan) {
    return res.status(400).json({
      error: `Sisa jamu di batch ini tidak cukup! Sisa: ${batch.sisa_liter.toFixed(1)} Liter, dibutuhkan: ${literDibutuhkan} Liter`
    });
  }

  const botolItem = (db.bahan || []).find(b => b.id === 'botol');

  // HANYA kurangi dan cek stok botol 200ml jika PENJUALAN!
  if (isJual) {
    if (isNaN(jumlahBotol) || jumlahBotol <= 0) {
      return res.status(400).json({ error: 'Jumlah botol penjualan tidak valid' });
    }
    if (!botolItem || botolItem.stok < jumlahBotol) {
      return res.status(400).json({
        error: `Stok botol kosong 200ml tidak cukup! Sisa stok botol: ${botolItem ? botolItem.stok : 0} pcs, dibutuhkan: ${jumlahBotol} pcs. Silakan tambah stok botol terlebih dahulu.`
      });
    }
    botolItem.stok -= jumlahBotol;
  }

  // Kurangi stok jamu di batch
  batch.sisa_liter = Number((batch.sisa_liter - literDibutuhkan).toFixed(2));

  const trx = {
    id: `TRX-${Date.now()}`,
    tanggal,
    tipe, // 'penjualan' atau 'konsumsi'
    batchId,
    botol: isJual ? jumlahBotol : 0,
    liter: literDibutuhkan,
    harga_total: isJual ? (Number(hargaTotal) || jumlahBotol * 5000) : 0,
    keterangan: keterangan || (isJual ? `Penjualan ${jumlahBotol} botol 200ml` : `Konsumsi Keluarga (${literDibutuhkan} Liter - Tanpa Botol)`)
  };

  if (!db.transaksi) db.transaksi = [];
  db.transaksi.unshift(trx);

  writeDB(db);
  res.json({ success: true, message: 'Transaksi berhasil dicatat', transaksi: trx });
});

// 7. Riwayat Lengkap (Semua Aktivitas)
app.get('/api/riwayat', (req, res) => {
  const db = readDB();
  const list = [];

  (db.batches || []).forEach(b => {
    list.push({
      id: b.id,
      tipe: 'produksi',
      tanggal: b.tanggal,
      judul: `Masak Jamu (Batch ${b.id})`,
      detail: `Hasil: ${b.total_liter} Liter (~${Math.round(b.total_liter / 0.2)} botol 200ml) | Sisa: ${b.sisa_liter}L`,
      subdetail: (b.bahan_terpakai || []).map(p => `${p.nama || p.id}: ${p.qty}${p.satuan}`).join(', ')
    });
  });

  (db.transaksi || []).forEach(t => {
    const isJual = t.tipe === 'penjualan';
    list.push({
      id: t.id,
      tipe: t.tipe,
      tanggal: t.tanggal,
      judul: isJual ? `Penjualan Jamu (${t.botol} Botol 200ml)` : `Konsumsi Keluarga (${t.liter} Liter - Tanpa Botol)`,
      detail: `Dari ${t.batchId} (${t.liter} Liter)` + (isJual && t.harga_total ? ` - Rp ${Number(t.harga_total).toLocaleString('id-ID')}` : ' - Langsung Minum'),
      subdetail: t.keterangan
    });
  });

  (db.riwayat_stok || []).forEach(s => {
    list.push({
      id: s.id,
      tipe: 'stok_masuk',
      tanggal: s.tanggal,
      judul: `Tambah Stok ${s.namaBahan}`,
      detail: `+${s.jumlah} ${s.satuan}`,
      subdetail: s.catatan || 'Belanja bahan baku'
    });
  });

  list.sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal));
  res.json(list);
});

// Jalankan Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🌿 Jamu Kunyit Asem App siap digunakan!`);
  console.log(`👉 Buka di browser: http://localhost:${PORT}`);
  console.log(`=======================================================`);
});
