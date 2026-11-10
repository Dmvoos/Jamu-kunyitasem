// docs/js/api.js - Adaptor API dengan fallback otomatis ke MockDB jika di GitHub Pages
const Api = {
  isGitHubPages: window.location.hostname.includes('github.io') || window.location.protocol === 'file:',
  apiBase: (window.location.protocol === 'http:' || window.location.protocol === 'https:') && !window.location.hostname.includes('github.io')
    ? window.location.origin
    : null,

  async getDashboard() {
    if (this.isGitHubPages || !this.apiBase) {
      return MockDB.load();
    }
    try {
      const res = await fetch(`${this.apiBase}/api/dashboard`);
      if (!res.ok) throw new Error('Network error');
      return await res.json();
    } catch (e) {
      return MockDB.load();
    }
  },

  async tambahStok(payload) {
    // payload: { id, jumlah, harga_beli, catatan }
    if (this.isGitHubPages || !this.apiBase) {
      const db = MockDB.load();
      const item = (db.bahan || []).find(b => b.id === payload.id);
      if (!item) throw new Error('Bahan tidak ditemukan');

      item.stok += payload.jumlah;
      if (!db.riwayat_stok) db.riwayat_stok = [];
      db.riwayat_stok.unshift({
        id: `LOG-${Date.now()}`,
        tanggal: new Date().toISOString().slice(0, 10),
        bahanId: item.id,
        namaBahan: item.nama,
        jumlah: payload.jumlah,
        satuan: item.satuan,
        harga_beli: payload.harga_beli || 0,
        catatan: payload.catatan || 'Pembelian Bahan Baku'
      });
      MockDB.save(db);
      return { success: true, db };
    }

    const res = await fetch(`${this.apiBase}/api/stok`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return await res.json();
  },

  async catatProduksi(payload) {
    // payload: { tanggal, totalLiter, pemakaian }
    if (this.isGitHubPages || !this.apiBase) {
      const db = MockDB.load();
      
      // Kurangi stok bahan
      for (const p of payload.pemakaian) {
        if (p.qty > 0) {
          const item = db.bahan.find(b => b.id === p.id);
          if (!item || item.stok < p.qty) {
            throw new Error(`Stok ${item ? item.nama : p.id} tidak cukup!`);
          }
          item.stok -= p.qty;
          p.satuan = item.satuan;
        }
      }

      const day = payload.tanggal.replace(/-/g, '');
      const count = (db.batches || []).filter(b => b.id.startsWith(`BATCH-${day}`)).length + 1;
      const batchId = `BATCH-${day}-${String(count).padStart(2, '0')}`;

      const newBatch = {
        id: batchId,
        tanggal: payload.tanggal,
        bahan_terpakai: payload.pemakaian.filter(p => p.qty > 0),
        total_liter: payload.totalLiter,
        sisa_liter: payload.totalLiter,
        catatan: 'Masak Jamu Kunyit Asem'
      };

      if (!db.batches) db.batches = [];
      db.batches.unshift(newBatch);
      MockDB.save(db);
      return { success: true, batchId, db };
    }

    const res = await fetch(`${this.apiBase}/api/produksi`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return await res.json();
  },

  async catatPenjualan(payload) {
    if (this.isGitHubPages || !this.apiBase) {
      const db = MockDB.load();
      const batch = (db.batches || []).find(b => b.id === payload.batchId);
      if (!batch) throw new Error('Batch tidak ditemukan');
      if (batch.sisa_liter < payload.literDibutuhkan) {
        throw new Error(`Sisa jamu di batch ${batch.id} tidak cukup!`);
      }

      const botolItem = (db.bahan || []).find(b => b.id === 'botol');
      if (payload.isJual) {
        if (!botolItem || botolItem.stok < payload.botol) {
          throw new Error(`Stok botol kosong 200ml tidak cukup! Sisa: ${botolItem ? botolItem.stok : 0} pcs`);
        }
        botolItem.stok -= payload.botol;
      }

      batch.sisa_liter = Number((batch.sisa_liter - payload.literDibutuhkan).toFixed(2));

      const trx = {
        id: `TRX-${Date.now()}`,
        tanggal: payload.tanggal,
        tipe: payload.tipe,
        batchId: payload.batchId,
        botol: payload.isJual ? payload.botol : 0,
        liter: payload.literDibutuhkan,
        harga_total: payload.isJual ? payload.hargaTotal : 0,
        keterangan: payload.keterangan
      };

      if (!db.transaksi) db.transaksi = [];
      db.transaksi.unshift(trx);
      MockDB.save(db);
      return { success: true, trx, db };
    }

    const res = await fetch(`${this.apiBase}/api/penjualan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return await res.json();
  },

  // Operasi CRUD Modifikasi Langsung (Edit / Hapus)
  saveDirectDB(db) {
    MockDB.save(db);
  }
};
