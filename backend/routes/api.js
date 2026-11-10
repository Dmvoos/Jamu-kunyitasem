// backend/routes/api.js - Endpoint Modular untuk Stok, Produksi, dan Penjualan
const express = require('express');
const router = express.Router();
const fs = require('fs-extra');
const path = require('path');
const sheetsService = require('../services/sheets');

const DB_FILE = path.join(__dirname, '../data/database.json');

function readDB() {
  try {
    return fs.readJsonSync(DB_FILE);
  } catch (err) {
    return { bahan: [], batches: [], transaksi: [], riwayat_stok: [] };
  }
}

function writeDB(data) {
  fs.writeJsonSync(DB_FILE, data, { spaces: 2 });
}

// 1. Dashboard Info
router.get('/dashboard', (req, res) => {
  const db = readDB();
  res.json(db);
});

// 2. Tambah Stok Bahan / Botol
router.post('/stok', async (req, res) => {
  const { id, jumlah, harga_beli, catatan } = req.body;
  const numJumlah = Number(jumlah);
  const numHargaBeli = Number(harga_beli) || 0;

  if (!id || isNaN(numJumlah) || numJumlah <= 0) {
    return res.status(400).json({ error: 'Data stok tidak valid' });
  }

  const db = readDB();
  const item = (db.bahan || []).find(b => b.id === id);
  if (!item) return res.status(404).json({ error: 'Bahan tidak ditemukan' });

  item.stok = (Number(item.stok) || 0) + numJumlah;

  const logEntry = {
    id: `LOG-${Date.now()}`,
    tanggal: new Date().toISOString().slice(0, 10),
    bahanId: item.id,
    namaBahan: item.nama,
    jumlah: numJumlah,
    satuan: item.satuan,
    harga_beli: numHargaBeli,
    catatan: catatan || 'Pembelian Bahan Baku'
  };

  if (!db.riwayat_stok) db.riwayat_stok = [];
  db.riwayat_stok.unshift(logEntry);
  writeDB(db);

  // Sync opsional ke Google Sheets jika terkonfigurasi
  try {
    await sheetsService.appendRow('Riwayat_Stok!A:G', [
      logEntry.id, logEntry.tanggal, logEntry.bahanId, logEntry.namaBahan, logEntry.jumlah, logEntry.harga_beli, logEntry.catatan
    ]);
  } catch (e) {}

  res.json({ success: true, item, log: logEntry });
});

// 3. Catat Produksi Masak Jamu
router.post('/produksi', async (req, res) => {
  const { tanggal, totalLiter, pemakaian } = req.body;
  const numTotalLiter = Number(totalLiter);

  if (!tanggal || isNaN(numTotalLiter) || numTotalLiter <= 0 || !Array.isArray(pemakaian)) {
    return res.status(400).json({ error: 'Parameter produksi tidak valid' });
  }

  const db = readDB();

  // Cek kecukupan stok
  for (const p of pemakaian) {
    if (p.qty > 0) {
      const item = (db.bahan || []).find(b => b.id === p.id);
      if (!item || item.stok < p.qty) {
        return res.status(400).json({ error: `Stok ${item ? item.nama : p.id} tidak mencukupi!` });
      }
      item.stok -= p.qty;
      p.satuan = item.satuan;
    }
  }

  const day = tanggal.replace(/-/g, '');
  const count = (db.batches || []).filter(b => b.id.startsWith(`BATCH-${day}`)).length + 1;
  const batchId = `BATCH-${day}-${String(count).padStart(2, '0')}`;

  const newBatch = {
    id: batchId,
    tanggal,
    bahan_terpakai: pemakaian.filter(p => p.qty > 0),
    total_liter: numTotalLiter,
    sisa_liter: numTotalLiter,
    catatan: 'Masak Jamu Kunyit Asem'
  };

  if (!db.batches) db.batches = [];
  db.batches.unshift(newBatch);
  writeDB(db);

  // Sync Google Sheets
  try {
    await sheetsService.appendRow('Batch_Produksi!A:E', [
      newBatch.id, newBatch.tanggal, newBatch.total_liter, newBatch.sisa_liter, newBatch.catatan
    ]);
  } catch (e) {}

  res.json({ success: true, batch: newBatch });
});

// 4. Catat Penjualan / Konsumsi
router.post('/penjualan', async (req, res) => {
  const { tanggal, tipe, batchId, botol, literDibutuhkan, hargaTotal, keterangan, isJual } = req.body;

  const db = readDB();
  const batch = (db.batches || []).find(b => b.id === batchId);
  if (!batch) return res.status(404).json({ error: 'Batch tidak ditemukan' });

  if (batch.sisa_liter < literDibutuhkan) {
    return res.status(400).json({ error: 'Sisa jamu di batch tidak cukup' });
  }

  const botolItem = (db.bahan || []).find(b => b.id === 'botol');
  if (isJual) {
    if (!botolItem || botolItem.stok < botol) {
      return res.status(400).json({ error: 'Stok botol kosong 200ml tidak mencukupi' });
    }
    botolItem.stok -= botol;
  }

  batch.sisa_liter = Number((batch.sisa_liter - literDibutuhkan).toFixed(2));

  const trx = {
    id: `TRX-${Date.now()}`,
    tanggal,
    tipe,
    batchId,
    botol: isJual ? botol : 0,
    liter: literDibutuhkan,
    harga_total: isJual ? hargaTotal : 0,
    keterangan
  };

  if (!db.transaksi) db.transaksi = [];
  db.transaksi.unshift(trx);
  writeDB(db);

  // Sync Google Sheets
  try {
    await sheetsService.appendRow('Transaksi!A:G', [
      trx.id, trx.tanggal, trx.tipe, trx.batchId, trx.botol, trx.liter, trx.harga_total
    ]);
  } catch (e) {}

  res.json({ success: true, transaksi: trx });
});

// 5. Sinkronisasi Edit / Hapus langsung dari UI
router.post('/sync', (req, res) => {
  const newDb = req.body;
  if (!newDb || !Array.isArray(newDb.bahan)) {
    return res.status(400).json({ error: 'Format database tidak valid' });
  }
  writeDB(newDb);
  res.json({ success: true });
});

// 6. Reset semua data ke 0
router.post('/reset', (req, res) => {
  const emptyDb = {
    bahan: [
      { id: 'kunyit', nama: 'Kunyit', satuan: 'gram', stok: 0, threshold: 500 },
      { id: 'jahe', nama: 'Jahe', satuan: 'gram', stok: 0, threshold: 300 },
      { id: 'asam', nama: 'Asam Jawa', satuan: 'gram', stok: 0, threshold: 250 },
      { id: 'gula', nama: 'Gula Merah', satuan: 'gram', stok: 0, threshold: 500 },
      { id: 'botol', nama: 'Botol 200ml', satuan: 'pcs', stok: 0, threshold: 20 }
    ],
    batches: [],
    transaksi: [],
    riwayat_stok: []
  };
  writeDB(emptyDb);
  res.json({ success: true, db: emptyDb });
});

module.exports = router;
