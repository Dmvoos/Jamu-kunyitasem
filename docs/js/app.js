// docs/js/app.js - Inisialisasi Aplikasi, Form Submissions, Modal Handlers, Routing
const App = {
  currentManageTab: 'transaksi',

  async init() {
    const todayStr = new Date().toISOString().slice(0, 10);
    const todayEl = document.getElementById('todayText');
    if (todayEl) {
      todayEl.textContent = new Date().toLocaleDateString('id-ID', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
      });
    }

    if (document.getElementById('prodDate')) document.getElementById('prodDate').value = todayStr;
    if (document.getElementById('saleDate')) document.getElementById('saleDate').value = todayStr;

    this.bindEvents();
    await this.refresh();
  },

  async refresh() {
    const db = await Api.getDashboard();
    UI.renderDashboard(db);
  },

  bindEvents() {
    // Masak liter -> botol preview
    const prodLiter = document.getElementById('prodLiter');
    if (prodLiter) {
      prodLiter.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value) || 0;
        const btl = Math.round(val / 0.2);
        document.getElementById('estBotolHasil').textContent = `Setara ~${btl} botol kemasan 200ml`;
      });
    }

    // Jual botol input
    const saleBotol = document.getElementById('saleBotol');
    if (saleBotol) {
      saleBotol.addEventListener('input', () => this.updateSaleCalc());
    }

    // Input stok hint
    const stockJml = document.getElementById('stockJumlah');
    const stockHrg = document.getElementById('stockHargaBeli');
    if (stockJml) stockJml.addEventListener('input', () => this.updateStockUnitHint());
    if (stockHrg) stockHrg.addEventListener('input', () => this.updateStockUnitHint());

    const stockSel = document.getElementById('stockBahanSelect');
    if (stockSel) {
      stockSel.addEventListener('change', async (e) => {
        const db = await Api.getDashboard();
        const sel = (db.bahan || []).find(b => b.id === e.target.value);
        if (sel) document.getElementById('stockSatuanLabel').textContent = sel.satuan;
        this.updateStockUnitHint();
      });
    }

    // Batch Select change
    const batchSel = document.getElementById('batchSelect');
    if (batchSel) {
      batchSel.addEventListener('change', async (e) => {
        const db = await Api.getDashboard();
        const selected = (db.batches || []).find(b => b.id === e.target.value);
        if (selected) {
          document.getElementById('batchDetailInfo').textContent = `Sisa di batch ini: ${selected.sisa_liter} Liter (~${Math.floor(selected.sisa_liter / 0.2)} botol)`;
        }
      });
    }

    // Forms
    this.bindForms();
  },

  bindForms() {
    // 1. Tambah Stok Form
    const stockForm = document.getElementById('stockForm');
    if (stockForm) {
      stockForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('stockBahanSelect').value;
        const jumlah = parseFloat(document.getElementById('stockJumlah').value);
        const hargaBeli = parseFloat(document.getElementById('stockHargaBeli').value) || 0;
        const catatan = document.getElementById('stockCatatan').value;

        if (!id || isNaN(jumlah) || jumlah <= 0) {
          alert('⚠️ Masukkan jumlah stok yang valid');
          return;
        }

        try {
          await Api.tambahStok({ id, jumlah, harga_beli: hargaBeli, catatan });
          alert(`✅ Berhasil! Penambahan stok dan modal belanja telah disimpan.`);
          this.closeStockModal();
          await this.refresh();
        } catch (err) {
          alert('Error: ' + err.message);
        }
      });
    }

    // 2. Masak Form
    const prodForm = document.getElementById('productionForm');
    if (prodForm) {
      prodForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const tanggal = document.getElementById('prodDate').value;
        const totalLiter = parseFloat(document.getElementById('prodLiter').value);

        if (!tanggal || isNaN(totalLiter) || totalLiter <= 0) {
          alert('⚠️ Harap isi tanggal dan hasil liter dengan benar');
          return;
        }

        const pemakaian = [
          { id: 'kunyit', nama: 'Kunyit', qty: parseFloat(document.getElementById('prodKunyit').value) || 0 },
          { id: 'jahe', nama: 'Jahe', qty: parseFloat(document.getElementById('prodJahe').value) || 0 },
          { id: 'asam', nama: 'Asam Jawa', qty: parseFloat(document.getElementById('prodAsam').value) || 0 },
          { id: 'gula', nama: 'Gula Merah', qty: parseFloat(document.getElementById('prodGula').value) || 0 }
        ];

        try {
          const res = await Api.catatProduksi({ tanggal, totalLiter, pemakaian });
          alert(`✅ Berhasil! ${res.batchId} dibuat dengan hasil ${totalLiter} Liter. Stok bahan telah terpotong.`);
          document.getElementById('prodKunyit').value = '';
          document.getElementById('prodJahe').value = '';
          document.getElementById('prodAsam').value = '';
          document.getElementById('prodGula').value = '';
          document.getElementById('prodLiter').value = '';
          this.closeProductionModal();
          await this.refresh();
        } catch (err) {
          alert('⚠️ ' + err.message);
        }
      });
    }

    // 3. Jual Form
    const salesForm = document.getElementById('salesForm');
    if (salesForm) {
      salesForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const tanggal = document.getElementById('saleDate').value;
        const tipe = document.getElementById('saleType').value;
        const batchId = document.getElementById('batchSelect').value;
        const isJual = tipe === 'penjualan';

        if (!batchId) {
          alert('⚠️ Tidak ada batch yang dipilih.');
          return;
        }

        let botol = 0;
        let literDibutuhkan = 0;
        let hargaTotal = 0;

        if (isJual) {
          botol = parseInt(document.getElementById('saleBotol').value);
          if (isNaN(botol) || botol <= 0) {
            alert('⚠️ Masukkan jumlah botol yang valid untuk penjualan');
            return;
          }
          literDibutuhkan = Number((botol * 0.2).toFixed(2));
          hargaTotal = parseFloat(document.getElementById('saleHarga').value) || (botol * 5000);
        } else {
          literDibutuhkan = parseFloat(document.getElementById('saleLiterKonsumsi').value);
          if (isNaN(literDibutuhkan) || literDibutuhkan <= 0) {
            alert('⚠️ Masukkan jumlah jamu yang diminum (dalam Liter)');
            return;
          }
          literDibutuhkan = Number(literDibutuhkan.toFixed(2));
          botol = 0;
          hargaTotal = 0;
        }

        const keterangan = document.getElementById('saleKet').value;

        try {
          await Api.catatPenjualan({
            tanggal, tipe, batchId, botol, literDibutuhkan, hargaTotal, isJual,
            keterangan: keterangan || (isJual ? `Penjualan ${botol} botol 200ml` : `Konsumsi Keluarga (${literDibutuhkan} Liter - Tanpa Botol)`)
          });

          if (isJual) {
            alert(`✅ Penjualan berhasil dicatat! Botol: ${botol} pcs, Liter: ${literDibutuhkan}L.`);
          } else {
            alert(`✅ Konsumsi keluarga berhasil dicatat! Diminum: ${literDibutuhkan} Liter (Stok botol 200ml aman).`);
          }

          this.closeSalesModal();
          await this.refresh();
        } catch (err) {
          alert('⚠️ ' + err.message);
        }
      });
    }

    // 4. Edit Bahan Form
    const editBahanForm = document.getElementById('editBahanForm');
    if (editBahanForm) {
      editBahanForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('editBahanId').value;
        const stokBaru = parseFloat(document.getElementById('editBahanStok').value);
        const thresholdBaru = parseFloat(document.getElementById('editBahanThreshold').value);

        const db = await Api.getDashboard();
        const item = (db.bahan || []).find(b => b.id === id);
        if (!item) return;

        item.stok = stokBaru;
        if (!isNaN(thresholdBaru) && thresholdBaru >= 0) item.threshold = thresholdBaru;
        Api.saveDirectDB(db);

        alert(`✅ Stok ${item.nama} berhasil diperbarui.`);
        this.closeEditBahanModal();
        await this.refresh();
      });
    }

    // 5. Edit Batch Form
    const editBatchForm = document.getElementById('editBatchForm');
    if (editBatchForm) {
      editBatchForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('editBatchId').value;
        const tgl = document.getElementById('editBatchDate').value;
        const totalLiter = parseFloat(document.getElementById('editBatchTotalLiter').value);
        const sisaLiter = parseFloat(document.getElementById('editBatchSisaLiter').value);

        const db = await Api.getDashboard();
        const batch = (db.batches || []).find(b => b.id === id);
        if (!batch) return;

        batch.tanggal = tgl;
        batch.total_liter = totalLiter;
        batch.sisa_liter = Number(sisaLiter.toFixed(2));
        Api.saveDirectDB(db);

        alert(`✅ Batch ${id} berhasil diperbarui.`);
        this.closeEditBatchModal();
        await this.refresh();
      });
    }

    // 6. Edit Trx Form
    const editTrxForm = document.getElementById('editTrxForm');
    if (editTrxForm) {
      editTrxForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('editTrxId').value;
        const tgl = document.getElementById('editTrxDate').value;
        const botol = parseInt(document.getElementById('editTrxBotol').value) || 0;
        const liter = parseFloat(document.getElementById('editTrxLiter').value) || 0;
        const harga = parseFloat(document.getElementById('editTrxHarga').value) || 0;
        const ket = document.getElementById('editTrxKet').value;

        const db = await Api.getDashboard();
        const trx = (db.transaksi || []).find(t => t.id === id);
        if (!trx) return;

        trx.tanggal = tgl;
        if (trx.tipe === 'penjualan') {
          trx.botol = botol;
          trx.harga_total = harga;
        }
        trx.liter = liter;
        trx.keterangan = ket;
        Api.saveDirectDB(db);

        alert('✅ Transaksi berhasil diperbarui.');
        this.closeEditTrxModal();
        await this.refresh();
      });
    }

    // 7. Edit Stok Masuk Form
    const editStokMasukForm = document.getElementById('editStokMasukForm');
    if (editStokMasukForm) {
      editStokMasukForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('editStokMasukId').value;
        const tgl = document.getElementById('editStokMasukDate').value;
        const jml = parseFloat(document.getElementById('editStokMasukJumlah').value) || 0;
        const harga = parseFloat(document.getElementById('editStokMasukHarga').value) || 0;
        const cat = document.getElementById('editStokMasukCatatan').value;

        const db = await Api.getDashboard();
        const item = (db.riwayat_stok || []).find(s => s.id === id);
        if (!item) return;

        item.tanggal = tgl;
        item.jumlah = jml;
        item.harga_beli = harga;
        item.catatan = cat;
        Api.saveDirectDB(db);

        alert('✅ Catatan pembelian modal berhasil diperbarui.');
        this.closeEditStokMasukModal();
        await this.refresh();
      });
    }
  },

  updateSaleCalc() {
    const btl = parseInt(document.getElementById('saleBotol').value) || 0;
    const ltr = (btl * 0.2).toFixed(1);
    document.getElementById('literCalcInfo').textContent = `Mengurangi ${ltr} Liter dari batch & ${btl} botol kemasan 200ml`;
    if (document.getElementById('saleType').value === 'penjualan') {
      document.getElementById('saleHarga').value = btl * 5000;
    }
  },

  async updateStockUnitHint() {
    const db = await Api.getDashboard();
    const bId = document.getElementById('stockBahanSelect').value;
    const item = (db.bahan || []).find(b => b.id === bId);
    const satuan = item ? item.satuan : '';
    const jml = parseFloat(document.getElementById('stockJumlah').value) || 0;
    const harga = parseFloat(document.getElementById('stockHargaBeli').value) || 0;
    const hintEl = document.getElementById('stockHargaUnitHint');

    if (jml > 0 && harga > 0) {
      const perUnit = Math.round(harga / jml);
      hintEl.textContent = `💡 Rp ${harga.toLocaleString('id-ID')} untuk ${jml} ${satuan} (~Rp ${perUnit.toLocaleString('id-ID')} / ${satuan})`;
    } else {
      hintEl.textContent = 'Modal belanja langsung dicatat untuk hitung keuntungan.';
    }
  },

  selectSaleType(type) {
    document.getElementById('saleType').value = type;
    const btnJual = document.getElementById('btnTypeJual');
    const btnKonsumsi = document.getElementById('btnTypeKonsumsi');
    const secJual = document.getElementById('sectionInputJual');
    const secKonsumsi = document.getElementById('sectionInputKonsumsi');
    const secHarga = document.getElementById('sectionHargaJual');
    const modalTitle = document.getElementById('modalSalesTitle');
    const modalDesc = document.getElementById('modalSalesDesc');
    const btnSubmit = document.getElementById('btnSubmitSale');
    const saleKet = document.getElementById('saleKet');

    if (type === 'penjualan') {
      btnJual.className = 'p-2.5 rounded-input border-2 border-accent bg-orange-50 text-accent font-bold text-xs flex items-center justify-center gap-1';
      btnKonsumsi.className = 'p-2.5 rounded-input border border-gray-200 bg-gray-50 text-gray-600 font-semibold text-xs flex items-center justify-center gap-1';
      secJual.classList.remove('hidden');
      secKonsumsi.classList.add('hidden');
      secHarga.classList.remove('hidden');
      modalTitle.textContent = 'Catat Penjualan Jamu';
      modalDesc.textContent = 'Mengurangi sisa liter batch & botol 200ml';
      btnSubmit.textContent = 'Simpan Penjualan';
      btnSubmit.className = 'w-full btn-touch bg-accent hover:bg-amber-600 text-white font-bold rounded-input shadow-md active:scale-98 transition';
      saleKet.placeholder = 'Misal: Pesanan Bu Joko (5 botol)';
      this.updateSaleCalc();
    } else {
      btnKonsumsi.className = 'p-2.5 rounded-input border-2 border-rose-500 bg-rose-50 text-rose-600 font-bold text-xs flex items-center justify-center gap-1';
      btnJual.className = 'p-2.5 rounded-input border border-gray-200 bg-gray-50 text-gray-600 font-semibold text-xs flex items-center justify-center gap-1';
      secJual.classList.add('hidden');
      secKonsumsi.classList.remove('hidden');
      secHarga.classList.add('hidden');
      document.getElementById('saleHarga').value = 0;
      modalTitle.textContent = 'Catat Minum Keluarga';
      modalDesc.textContent = 'Hanya mengurangi liter batch (TANPA kurangi stok botol 200ml)';
      btnSubmit.textContent = 'Simpan Minum Keluarga';
      btnSubmit.className = 'w-full btn-touch bg-rose-500 hover:bg-rose-600 text-white font-bold rounded-input shadow-md active:scale-98 transition';
      saleKet.placeholder = 'Misal: Diminum Bapak & Anak';
      if (!document.getElementById('saleLiterKonsumsi').value) {
        document.getElementById('saleLiterKonsumsi').value = '0.2';
      }
    }
  },

  addBotolQuick(n) {
    const inp = document.getElementById('saleBotol');
    inp.value = (parseInt(inp.value) || 0) + n;
    this.updateSaleCalc();
  },

  addStockQuick(n) {
    const inp = document.getElementById('stockJumlah');
    inp.value = (parseFloat(inp.value) || 0) + n;
    this.updateStockUnitHint();
  },

  setLiterKonsumsi(ltr) {
    document.getElementById('saleLiterKonsumsi').value = ltr;
  },

  // Modal Toggles
  currentBahanTab: 'total',

  async openBahanDashboardModal() {
    this.currentBahanTab = 'total';
    this.switchBahanTab('total');
    document.getElementById('bahanDashboardModal').classList.remove('hidden');
    document.getElementById('bahanDashboardModal').classList.add('flex');
  },
  closeBahanDashboardModal() {
    document.getElementById('bahanDashboardModal').classList.add('hidden');
    document.getElementById('bahanDashboardModal').classList.remove('flex');
  },

  async switchBahanTab(tab) {
    this.currentBahanTab = tab;
    const tabTotalBtn = document.getElementById('tabBahanTotalBtn');
    const tabHistoryBtn = document.getElementById('tabBahanHistoryBtn');
    const viewTotal = document.getElementById('viewBahanTotal');
    const viewHistory = document.getElementById('viewBahanHistory');
    const filterContainer = document.getElementById('bahanFilterContainer');

    if (tab === 'total') {
      tabTotalBtn.className = 'flex-1 py-2 text-emerald-600 border-b-2 border-emerald-600';
      tabHistoryBtn.className = 'flex-1 py-2 text-gray-400 hover:text-primary';
      viewTotal.classList.remove('hidden');
      viewHistory.classList.add('hidden');
      filterContainer.classList.add('hidden');
    } else {
      tabHistoryBtn.className = 'flex-1 py-2 text-emerald-600 border-b-2 border-emerald-600';
      tabTotalBtn.className = 'flex-1 py-2 text-gray-400 hover:text-primary';
      viewHistory.classList.remove('hidden');
      viewTotal.classList.add('hidden');
      filterContainer.classList.remove('hidden');
    }

    const db = await Api.getDashboard();
    const filterVal = document.getElementById('bahanFilterSelect') ? document.getElementById('bahanFilterSelect').value : 'all';
    UI.renderBahanDashboardViews(db, filterVal);
  },

  async filterBahanHistory() {
    const filterVal = document.getElementById('bahanFilterSelect').value;
    const db = await Api.getDashboard();
    UI.renderBahanDashboardViews(db, filterVal);
  },

  async hapusRiwayatBahanKhusus(logId) {
    const db = await Api.getDashboard();
    const logItem = (db.riwayat_stok || []).find(s => s.id === logId);
    if (!logItem) return;

    const pesan = `Hapus riwayat pembelian ${logItem.namaBahan} (+${logItem.jumlah} ${logItem.satuan})?\n\n` +
                  `⚠️ PERHATIAN:\nMenghapus riwayat belanja ini juga akan OTOMATIS MENGURANGI stok ${logItem.namaBahan} sebesar ${logItem.jumlah} ${logItem.satuan} agar sinkron dengan stok fisik.`;

    if (!confirm(pesan)) return;

    // Kurangi stok bahan yang bersangkutan
    const targetBahan = (db.bahan || []).find(b => b.id === logItem.bahanId);
    if (targetBahan) {
      targetBahan.stok = Math.max(0, targetBahan.stok - Number(logItem.jumlah || 0));
    }

    // Hapus dari riwayat stok
    db.riwayat_stok = db.riwayat_stok.filter(s => s.id !== logId);
    Api.saveDirectDB(db);

    alert(`🗑️ Riwayat berhasil dihapus!\nStok ${logItem.namaBahan} telah disesuaikan menjadi ${targetBahan ? targetBahan.stok : 0} ${logItem.satuan}.`);
    
    // Refresh view
    const filterVal = document.getElementById('bahanFilterSelect') ? document.getElementById('bahanFilterSelect').value : 'all';
    UI.renderBahanDashboardViews(db, filterVal);
    await this.refresh();
  },

  // Modal Toggles
  async openStockModal() {
    await this.refresh();
    document.getElementById('stockJumlah').value = '';
    document.getElementById('stockHargaBeli').value = '';
    document.getElementById('stockCatatan').value = '';
    this.updateStockUnitHint();
    document.getElementById('stockModal').classList.remove('hidden');
    document.getElementById('stockModal').classList.add('flex');
  },
  closeStockModal() {
    document.getElementById('stockModal').classList.add('hidden');
    document.getElementById('stockModal').classList.remove('flex');
  },

  async openProductionModal() {
    await this.refresh();
    document.getElementById('prodModal').classList.remove('hidden');
    document.getElementById('prodModal').classList.add('flex');
  },
  closeProductionModal() {
    document.getElementById('prodModal').classList.add('hidden');
    document.getElementById('prodModal').classList.remove('flex');
  },

  async openSalesModal() {
    await this.refresh();
    document.getElementById('saleBotol').value = 1;
    document.getElementById('saleLiterKonsumsi').value = 0.2;
    this.selectSaleType('penjualan');
    document.getElementById('salesModal').classList.remove('hidden');
    document.getElementById('salesModal').classList.add('flex');
  },
  closeSalesModal() {
    document.getElementById('salesModal').classList.add('hidden');
    document.getElementById('salesModal').classList.remove('flex');
  },

  async openHistoryModal() {
    const db = await Api.getDashboard();
    UI.renderHistoryList(db);
    document.getElementById('historyModal').classList.remove('hidden');
    document.getElementById('historyModal').classList.add('flex');
  },
  closeHistoryModal() {
    document.getElementById('historyModal').classList.add('hidden');
    document.getElementById('historyModal').classList.remove('flex');
  },

  // Edit Modals
  async openEditBahanModal(bahanId) {
    const db = await Api.getDashboard();
    const item = (db.bahan || []).find(b => b.id === bahanId);
    if (!item) return;

    document.getElementById('editBahanId').value = item.id;
    document.getElementById('editBahanNamaDesc').textContent = `Ubah data fisik untuk ${item.nama}`;
    document.getElementById('editBahanStok').value = item.stok;
    document.getElementById('editBahanSatuan').textContent = item.satuan;
    document.getElementById('editBahanThreshold').value = item.threshold;
    document.getElementById('editBahanThreshSatuan').textContent = item.satuan;

    document.getElementById('editBahanModal').classList.remove('hidden');
    document.getElementById('editBahanModal').classList.add('flex');
  },
  closeEditBahanModal() {
    document.getElementById('editBahanModal').classList.add('hidden');
    document.getElementById('editBahanModal').classList.remove('flex');
  },

  async openEditBatchModal(batchId) {
    const db = await Api.getDashboard();
    const batch = (db.batches || []).find(b => b.id === batchId);
    if (!batch) return;

    document.getElementById('editBatchId').value = batch.id;
    document.getElementById('editBatchTitleDesc').textContent = `Batch: ${batch.id}`;
    document.getElementById('editBatchDate').value = (batch.tanggal || '').slice(0, 10);
    document.getElementById('editBatchTotalLiter').value = batch.total_liter;
    document.getElementById('editBatchSisaLiter').value = batch.sisa_liter;

    document.getElementById('editBatchModal').classList.remove('hidden');
    document.getElementById('editBatchModal').classList.add('flex');
  },
  closeEditBatchModal() {
    document.getElementById('editBatchModal').classList.add('hidden');
    document.getElementById('editBatchModal').classList.remove('flex');
  },

  async hapusBatchAktif() {
    const id = document.getElementById('editBatchId').value;
    if (!confirm(`Apakah Anda yakin ingin MENGHAPUS batch ${id}?`)) return;
    const db = await Api.getDashboard();
    db.batches = (db.batches || []).filter(b => b.id !== id);
    Api.saveDirectDB(db);
    alert(`🗑️ Batch ${id} berhasil dihapus.`);
    this.closeEditBatchModal();
    await this.refresh();
  },

  // Manage Data Modal
  openManageDataModal() {
    this.switchManageTab('transaksi');
    document.getElementById('manageDataModal').classList.remove('hidden');
    document.getElementById('manageDataModal').classList.add('flex');
  },
  closeManageDataModal() {
    document.getElementById('manageDataModal').classList.add('hidden');
    document.getElementById('manageDataModal').classList.remove('flex');
  },

  async switchManageTab(tab) {
    this.currentManageTab = tab;
    const tabTrx = document.getElementById('tabBtnTrx');
    const tabStok = document.getElementById('tabBtnStok');

    if (tab === 'transaksi') {
      tabTrx.className = 'flex-1 py-2 text-accent border-b-2 border-accent';
      tabStok.className = 'flex-1 py-2 text-gray-400 hover:text-primary';
    } else {
      tabStok.className = 'flex-1 py-2 text-accent border-b-2 border-accent';
      tabTrx.className = 'flex-1 py-2 text-gray-400 hover:text-primary';
    }
    await this.renderManageItemsList();
  },

  async renderManageItemsList() {
    const db = await Api.getDashboard();
    const container = document.getElementById('manageItemsList');
    container.innerHTML = '';

    if (this.currentManageTab === 'transaksi') {
      const list = db.transaksi || [];
      if (list.length === 0) {
        container.innerHTML = '<p class="text-xs text-gray-400 text-center py-6">Belum ada riwayat penjualan / minum.</p>';
        return;
      }

      list.forEach(t => {
        const isJual = t.tipe === 'penjualan';
        const card = document.createElement('div');
        card.className = 'p-3 bg-inputBg rounded-card border border-gray-100 flex justify-between items-center';
        card.innerHTML = `
          <div>
            <p class="text-xs font-bold text-primary">${isJual ? `💰 Jual (${t.botol} btl)` : `❤️ Minum Keluarga (${t.liter} L)`}</p>
            <p class="text-[10px] text-gray-500">${UI.formatDateIndo(t.tanggal)} | ${t.batchId || '-'} ${isJual ? `| Rp ${Number(t.harga_total || 0).toLocaleString('id-ID')}` : ''}</p>
            ${t.keterangan ? `<p class="text-[10px] text-gray-400 italic">${t.keterangan}</p>` : ''}
          </div>
          <div class="flex gap-1.5 shrink-0">
            <button onclick="App.closeManageDataModal(); App.openEditTrxModal('${t.id}')" class="px-2.5 py-1 text-xs font-bold bg-white text-gray-700 hover:text-primary border border-gray-200 rounded-lg">Edit</button>
            <button onclick="App.hapusTransaksiLangsung('${t.id}')" class="px-2.5 py-1 text-xs font-bold bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 rounded-lg">Hapus</button>
          </div>
        `;
        container.appendChild(card);
      });
    } else {
      const list = db.riwayat_stok || [];
      if (list.length === 0) {
        container.innerHTML = '<p class="text-xs text-gray-400 text-center py-6">Belum ada riwayat pembelian modal bahan.</p>';
        return;
      }

      list.forEach(s => {
        const biaya = Number(s.harga_beli) || 0;
        const card = document.createElement('div');
        card.className = 'p-3 bg-inputBg rounded-card border border-gray-100 flex justify-between items-center';
        card.innerHTML = `
          <div>
            <p class="text-xs font-bold text-primary">📦 Beli ${s.namaBahan} (+${s.jumlah} ${s.satuan})</p>
            <p class="text-[10px] text-gray-500">${UI.formatDateIndo(s.tanggal)} | Modal: Rp ${biaya.toLocaleString('id-ID')}</p>
            ${s.catatan ? `<p class="text-[10px] text-gray-400 italic">${s.catatan}</p>` : ''}
          </div>
          <div class="flex gap-1.5 shrink-0">
            <button onclick="App.closeManageDataModal(); App.openEditStokMasukModal('${s.id}')" class="px-2.5 py-1 text-xs font-bold bg-white text-gray-700 hover:text-primary border border-gray-200 rounded-lg">Edit</button>
            <button onclick="App.hapusStokMasukLangsung('${s.id}')" class="px-2.5 py-1 text-xs font-bold bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 rounded-lg">Hapus</button>
          </div>
        `;
        container.appendChild(card);
      });
    }
  },

  async openEditTrxModal(trxId) {
    const db = await Api.getDashboard();
    const trx = (db.transaksi || []).find(t => t.id === trxId);
    if (!trx) return;

    document.getElementById('editTrxId').value = trx.id;
    document.getElementById('editTrxSubTitle').textContent = `${trx.id} (${trx.tipe === 'penjualan' ? 'Penjualan' : 'Minum Keluarga'})`;
    document.getElementById('editTrxDate').value = (trx.tanggal || '').slice(0, 10);
    document.getElementById('editTrxBotol').value = trx.botol || 0;
    document.getElementById('editTrxLiter').value = trx.liter || 0;
    document.getElementById('editTrxHarga').value = trx.harga_total || 0;
    document.getElementById('editTrxKet').value = trx.keterangan || '';

    const secBotol = document.getElementById('secEditTrxBotol');
    const secHarga = document.getElementById('secEditTrxHarga');

    if (trx.tipe === 'penjualan') {
      secBotol.classList.remove('hidden');
      secHarga.classList.remove('hidden');
    } else {
      secBotol.classList.add('hidden');
      secHarga.classList.add('hidden');
    }

    document.getElementById('editTrxModal').classList.remove('hidden');
    document.getElementById('editTrxModal').classList.add('flex');
  },
  closeEditTrxModal() {
    document.getElementById('editTrxModal').classList.add('hidden');
    document.getElementById('editTrxModal').classList.remove('flex');
  },

  async hapusTransaksiAktif() {
    const id = document.getElementById('editTrxId').value;
    await this.hapusTransaksiLangsung(id);
    this.closeEditTrxModal();
  },

  async hapusTransaksiLangsung(id) {
    if (!confirm('Apakah Anda yakin ingin MENGHAPUS catatan transaksi ini?')) return;
    const db = await Api.getDashboard();
    db.transaksi = (db.transaksi || []).filter(t => t.id !== id);
    Api.saveDirectDB(db);
    alert('🗑️ Catatan transaksi berhasil dihapus.');
    await this.renderManageItemsList();
    await this.refresh();
  },

  async openEditStokMasukModal(logId) {
    const db = await Api.getDashboard();
    const item = (db.riwayat_stok || []).find(s => s.id === logId);
    if (!item) return;

    document.getElementById('editStokMasukId').value = item.id;
    document.getElementById('editStokMasukTitleDesc').textContent = `Beli ${item.namaBahan}`;
    document.getElementById('editStokMasukDate').value = (item.tanggal || '').slice(0, 10);
    document.getElementById('editStokMasukJumlah').value = item.jumlah || 0;
    document.getElementById('editStokMasukSatuan').textContent = item.satuan || '';
    document.getElementById('editStokMasukHarga').value = item.harga_beli || 0;
    document.getElementById('editStokMasukCatatan').value = item.catatan || '';

    document.getElementById('editStokMasukModal').classList.remove('hidden');
    document.getElementById('editStokMasukModal').classList.add('flex');
  },
  closeEditStokMasukModal() {
    document.getElementById('editStokMasukModal').classList.add('hidden');
    document.getElementById('editStokMasukModal').classList.remove('flex');
  },

  async hapusStokMasukAktif() {
    const id = document.getElementById('editStokMasukId').value;
    await this.hapusStokMasukLangsung(id);
    this.closeEditStokMasukModal();
  },

  async hapusStokMasukLangsung(id) {
    if (!confirm('Apakah Anda yakin ingin MENGHAPUS catatan belanja modal ini?')) return;
    const db = await Api.getDashboard();
    db.riwayat_stok = (db.riwayat_stok || []).filter(s => s.id !== id);
    Api.saveDirectDB(db);
    alert('🗑️ Catatan belanja berhasil dihapus.');
    await this.renderManageItemsList();
    await this.refresh();
  },

  resetDataSemua() {
    if (confirm('Apakah Ibu yakin ingin mereset semua data kembali ke 0 (stok awal kosong)?')) {
      MockDB.reset();
      alert('Data aplikasi berhasil direset bersih ke 0!');
      this.refresh();
    }
  }
};

// Start application on DOM Ready
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
