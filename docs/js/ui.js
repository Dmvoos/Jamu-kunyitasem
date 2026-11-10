// docs/js/ui.js - Logika manipulasi DOM, render kartu, grafik keuntungan, modal, timeline
let profitChartInstance = null;

const UI = {
  formatDateIndo(dateStr) {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  },

  renderDashboard(db) {
    const batches = db.batches || [];
    const bahan = db.bahan || [];
    const transaksi = db.transaksi || [];

    // 1. Sisa Jamu Siap Jual
    const totalJamuLiters = batches.reduce((sum, b) => sum + (Number(b.sisa_liter) || 0), 0);
    const botolItem = bahan.find(b => b.id === 'botol') || { stok: 0 };
    const stockBotol = botolItem.stok;

    // Produksi 7 hari terakhir
    const now = new Date();
    const weekAgo = new Date();
    weekAgo.setDate(now.getDate() - 7);

    const weeklyLiters = batches
      .filter(b => new Date(b.tanggal) >= weekAgo)
      .reduce((sum, b) => sum + (Number(b.total_liter) || 0), 0);

    const totalTerjualBotol = transaksi
      .filter(t => t.tipe === 'penjualan')
      .reduce((sum, t) => sum + (Number(t.botol) || 0), 0);

    const totalKonsumsiLiter = transaksi
      .filter(t => t.tipe === 'konsumsi')
      .reduce((sum, t) => sum + (Number(t.liter) || (Number(t.botol) * 0.2) || 0), 0);

    // Update Text Elements
    document.getElementById('weeklyLiters').textContent = `${weeklyLiters.toFixed(1)} Liter`;
    document.getElementById('weeklyBottles').textContent = `~${Math.round(weeklyLiters / 0.2)} botol 200ml`;
    document.getElementById('totalSoldText').textContent = `Terjual: ${totalTerjualBotol} btl | Keluarga: ${totalKonsumsiLiter.toFixed(1)} L`;

    const targetWeekly = 30;
    const perc = Math.min(100, Math.round((weeklyLiters / targetWeekly) * 100));
    document.getElementById('progressCircle').setAttribute('stroke-dasharray', `${perc}, 100`);
    document.getElementById('progressText').textContent = `${perc}%`;

    document.getElementById('stockJamu').textContent = `${totalJamuLiters.toFixed(1)} Liter`;
    document.getElementById('stockJamuBotol').textContent = `~${Math.floor(totalJamuLiters / 0.2)} botol siap saji`;
    document.getElementById('stockBotol').textContent = `${stockBotol} pcs`;

    const statusBotolEl = document.getElementById('statusBotol');
    if (stockBotol <= 10) {
      statusBotolEl.textContent = 'Kritis! Segera beli';
      statusBotolEl.className = 'text-[11px] text-warn mt-1 font-bold';
    } else if (stockBotol <= 25) {
      statusBotolEl.textContent = 'Mulai Menipis';
      statusBotolEl.className = 'text-[11px] text-amber-600 mt-1 font-semibold';
    } else {
      statusBotolEl.textContent = 'Stok Aman';
      statusBotolEl.className = 'text-[11px] text-emerald-600 mt-1 font-semibold';
    }

    // Status Bahan Menipis
    const lowItems = bahan.filter(b => b.stok < b.threshold);
    if (lowItems.length > 0) {
      document.getElementById('lowStockCount').textContent = `${lowItems.length} Bahan Kritis!`;
      document.getElementById('lowStockCount').className = 'text-sm font-bold text-warn mt-1';
      document.getElementById('lowStockNames').textContent = lowItems.map(b => b.nama).join(', ');
    } else {
      document.getElementById('lowStockCount').textContent = 'Semua Aman';
      document.getElementById('lowStockCount').className = 'text-sm font-bold text-emerald-600 mt-1';
      document.getElementById('lowStockNames').textContent = 'Stok mencukupi produksi';
    }

    this.renderBahanList(bahan);
    this.populateStockSelect(bahan);
    this.renderActiveBatches(batches);
    this.renderProfitChart(db);
  },

  renderBahanList(bahanList) {
    const container = document.getElementById('bahanListGrid');
    container.innerHTML = '';

    bahanList.forEach(item => {
      const isLow = item.stok < item.threshold;
      const row = document.createElement('div');
      row.className = `flex justify-between items-center p-2.5 rounded-input ${isLow ? 'bg-red-50 border border-red-200' : 'bg-inputBg'}`;
      row.innerHTML = `
        <div class="flex items-center gap-2">
          <span class="w-2.5 h-2.5 rounded-full ${isLow ? 'bg-warn' : 'bg-emerald-500'}"></span>
          <div>
            <p class="text-xs font-bold text-primary">${item.nama}</p>
            <p class="text-[10px] text-gray-500">Batas aman: ${item.threshold} ${item.satuan}</p>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <div class="text-right">
            <span class="text-sm font-bold ${isLow ? 'text-warn' : 'text-primary'}">${item.stok.toLocaleString('id-ID')}</span>
            <span class="text-xs text-gray-600 font-medium">${item.satuan}</span>
          </div>
          <button onclick="App.openEditBahanModal('${item.id}')" title="Koreksi stok" class="p-1 rounded-lg bg-white border border-gray-200 text-gray-500 hover:text-primary active:scale-95 text-xs">
            ✏️
          </button>
        </div>
      `;
      container.appendChild(row);
    });

    const bKunyit = bahanList.find(b => b.id === 'kunyit');
    const bJahe = bahanList.find(b => b.id === 'jahe');
    const bAsam = bahanList.find(b => b.id === 'asam');
    const bGula = bahanList.find(b => b.id === 'gula');

    if (bKunyit) document.getElementById('stockKunyitHint').textContent = `Sisa: ${bKunyit.stok}g`;
    if (bJahe) document.getElementById('stockJaheHint').textContent = `Sisa: ${bJahe.stok}g`;
    if (bAsam) document.getElementById('stockAsamHint').textContent = `Sisa: ${bAsam.stok}g`;
    if (bGula) document.getElementById('stockGulaHint').textContent = `Sisa: ${bGula.stok}g`;
  },

  renderBahanDashboardViews(db, filterBahanId = 'all') {
    const bahanList = db.bahan || [];
    const riwayatStok = db.riwayat_stok || [];

    // 1. Render Tab Total Bahan Baku
    const totalContainer = document.getElementById('viewBahanTotal');
    if (totalContainer) {
      totalContainer.innerHTML = '';
      bahanList.forEach(item => {
        const isLow = item.stok < item.threshold;
        const totalBeliItem = riwayatStok
          .filter(s => s.bahanId === item.id)
          .reduce((sum, s) => sum + (Number(s.jumlah) || 0), 0);
        const totalModalItem = riwayatStok
          .filter(s => s.bahanId === item.id)
          .reduce((sum, s) => sum + (Number(s.harga_beli) || 0), 0);

        const card = document.createElement('div');
        card.className = `p-3.5 rounded-card border ${isLow ? 'bg-red-50/70 border-red-200' : 'bg-inputBg border-gray-100'} flex flex-col justify-between`;
        card.innerHTML = `
          <div class="flex justify-between items-start mb-2">
            <div class="flex items-center gap-2">
              <span class="w-3 h-3 rounded-full ${isLow ? 'bg-warn' : 'bg-emerald-500'}"></span>
              <div>
                <h4 class="text-sm font-bold text-primary">${item.nama}</h4>
                <p class="text-[11px] text-gray-500">Batas Minimum: ${item.threshold} ${item.satuan}</p>
              </div>
            </div>
            <div class="text-right">
              <span class="text-base font-bold ${isLow ? 'text-warn' : 'text-primary'}">${item.stok.toLocaleString('id-ID')}</span>
              <span class="text-xs text-gray-600 font-medium">${item.satuan}</span>
            </div>
          </div>
          <div class="pt-2 border-t border-gray-200/60 flex justify-between items-center text-[11px] text-gray-600">
            <div>
              <span>Total Pernah Dibeli: <strong>${totalBeliItem.toLocaleString('id-ID')} ${item.satuan}</strong></span>
              <span class="mx-1">•</span>
              <span>Modal: <strong>Rp ${totalModalItem.toLocaleString('id-ID')}</strong></span>
            </div>
            <button onclick="App.openEditBahanModal('${item.id}')" class="px-2 py-0.5 rounded bg-white text-primary border border-gray-200 font-semibold text-[11px] hover:bg-gray-50">
              ✏️ Edit Stok Fisik
            </button>
          </div>
        `;
        totalContainer.appendChild(card);
      });
    }

    // 2. Render Tab Riwayat Khusus Pembelian Bahan (Bisa Dihapus)
    const historyContainer = document.getElementById('viewBahanHistory');
    if (historyContainer) {
      historyContainer.innerHTML = '';
      let filteredLogs = riwayatStok;
      if (filterBahanId !== 'all') {
        filteredLogs = riwayatStok.filter(s => s.bahanId === filterBahanId);
      }

      if (filteredLogs.length === 0) {
        historyContainer.innerHTML = '<p class="text-xs text-gray-400 text-center py-8">Belum ada riwayat pembelian untuk bahan ini.</p>';
        return;
      }

      filteredLogs.forEach(s => {
        const biaya = Number(s.harga_beli) || 0;
        const card = document.createElement('div');
        card.className = 'p-3 bg-inputBg rounded-card border border-gray-100 flex justify-between items-center';
        card.innerHTML = `
          <div>
            <div class="flex items-center gap-1.5">
              <span class="text-xs font-bold text-primary">${s.namaBahan}</span>
              <span class="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded">+${s.jumlah} ${s.satuan}</span>
            </div>
            <p class="text-[11px] text-gray-600 mt-0.5">
              ${this.formatDateIndo(s.tanggal)} • Modal: <strong>Rp ${biaya.toLocaleString('id-ID')}</strong>
            </p>
            ${s.catatan ? `<p class="text-[10px] text-gray-400 italic">${s.catatan}</p>` : ''}
          </div>
          <div class="flex gap-1.5 shrink-0">
            <button onclick="App.openEditStokMasukModal('${s.id}')" class="px-2.5 py-1 text-xs font-bold bg-white text-gray-700 hover:text-primary border border-gray-200 rounded-lg">Edit</button>
            <button onclick="App.hapusRiwayatBahanKhusus('${s.id}')" title="Hapus riwayat & kurangi stok otomatis" class="px-2.5 py-1 text-xs font-bold bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 rounded-lg">
              🗑️ Hapus
            </button>
          </div>
        `;
        historyContainer.appendChild(card);
      });
    }
  },

  populateStockSelect(bahanList) {
    const select = document.getElementById('stockBahanSelect');
    const currentVal = select.value;
    select.innerHTML = '';
    bahanList.forEach(item => {
      const opt = document.createElement('option');
      opt.value = item.id;
      opt.textContent = `${item.nama} (Stok: ${item.stok} ${item.satuan})`;
      select.appendChild(opt);
    });
    if (currentVal) select.value = currentVal;
    if (select.value) {
      const sel = bahanList.find(b => b.id === select.value);
      if (sel) document.getElementById('stockSatuanLabel').textContent = sel.satuan;
    }
  },

  renderActiveBatches(batches) {
    const container = document.getElementById('batchActiveList');
    container.innerHTML = '';

    const activeBatches = batches.filter(b => b.sisa_liter > 0);
    if (activeBatches.length === 0) {
      container.innerHTML = '<p class="text-xs text-gray-400 text-center py-2">Belum ada batch jamu siap jual. Silakan masak jamu baru!</p>';
    } else {
      activeBatches.forEach(b => {
        const btl = Math.floor(b.sisa_liter / 0.2);
        const div = document.createElement('div');
        div.className = 'flex justify-between items-center p-2.5 rounded-input bg-inputBg border border-gray-100';
        div.innerHTML = `
          <div>
            <p class="text-xs font-bold text-primary">${b.id}</p>
            <p class="text-[10px] text-gray-500">Tgl: ${this.formatDateIndo(b.tanggal)} | Total Masak: ${b.total_liter}L</p>
          </div>
          <div class="flex items-center gap-2">
            <div class="text-right">
              <span class="text-sm font-bold text-accent">${b.sisa_liter} Liter</span>
              <p class="text-[10px] text-gray-500 font-medium">~${btl} botol tersisa</p>
            </div>
            <button onclick="App.openEditBatchModal('${b.id}')" title="Edit batch / stok jamu" class="p-1 rounded-lg bg-white border border-gray-200 text-gray-500 hover:text-primary active:scale-95 text-xs">
              ✏️
            </button>
          </div>
        `;
        container.appendChild(div);
      });
    }

    const select = document.getElementById('batchSelect');
    select.innerHTML = '';
    if (activeBatches.length === 0) {
      select.innerHTML = '<option value="">Tidak ada batch dengan stok tersedia</option>';
      document.getElementById('batchDetailInfo').textContent = 'Silakan masak jamu terlebih dahulu.';
    } else {
      activeBatches.forEach(b => {
        const opt = document.createElement('option');
        opt.value = b.id;
        opt.textContent = `${b.id} (${this.formatDateIndo(b.tanggal)}) - Sisa: ${b.sisa_liter}L`;
        select.appendChild(opt);
      });
      document.getElementById('batchDetailInfo').textContent = `Sisa di batch ini: ${activeBatches[0].sisa_liter} Liter (~${Math.floor(activeBatches[0].sisa_liter / 0.2)} botol)`;
    }
  },

  renderProfitChart(db) {
    const riwayatStok = db.riwayat_stok || [];
    const transaksi = db.transaksi || [];

    const totalModal = riwayatStok.reduce((sum, item) => sum + (Number(item.harga_beli) || 0), 0);
    const totalPenjualan = transaksi
      .filter(t => t.tipe === 'penjualan')
      .reduce((sum, t) => sum + (Number(t.harga_total) || 0), 0);
    const keuntungan = totalPenjualan - totalModal;

    document.getElementById('statTotalModal').textContent = `Rp ${totalModal.toLocaleString('id-ID')}`;
    document.getElementById('statTotalJual').textContent = `Rp ${totalPenjualan.toLocaleString('id-ID')}`;
    
    const untungEl = document.getElementById('statTotalUntung');
    const badgeEl = document.getElementById('chartProfitBadge');

    if (keuntungan >= 0) {
      untungEl.textContent = `+Rp ${keuntungan.toLocaleString('id-ID')}`;
      untungEl.className = 'text-xs font-bold text-emerald-600 mt-0.5';
      badgeEl.textContent = `+Rp ${keuntungan.toLocaleString('id-ID')}`;
      badgeEl.className = 'text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700';
    } else {
      untungEl.textContent = `-Rp ${Math.abs(keuntungan).toLocaleString('id-ID')}`;
      untungEl.className = 'text-xs font-bold text-rose-600 mt-0.5';
      badgeEl.textContent = `-Rp ${Math.abs(keuntungan).toLocaleString('id-ID')}`;
      badgeEl.className = 'text-xs font-bold px-2.5 py-1 rounded-full bg-rose-100 text-rose-700';
    }

    const labels = [];
    const modalPerDay = [];
    const jualPerDay = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      labels.push(d.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric' }));

      const modalHari = riwayatStok
        .filter(s => (s.tanggal || '').slice(0, 10) === dateStr)
        .reduce((sum, s) => sum + (Number(s.harga_beli) || 0), 0);
      modalPerDay.push(modalHari);

      const jualHari = transaksi
        .filter(t => t.tipe === 'penjualan' && (t.tanggal || '').slice(0, 10) === dateStr)
        .reduce((sum, t) => sum + (Number(t.harga_total) || 0), 0);
      jualPerDay.push(jualHari);
    }

    const summaryTextEl = document.getElementById('chartSummaryText');
    if (totalModal === 0 && totalPenjualan === 0) {
      summaryTextEl.textContent = 'Belum ada catatan modal belanja maupun penjualan.';
    } else if (keuntungan > 0) {
      summaryTextEl.textContent = `🎉 Selamat! Penjualan sudah menutup modal belanja dengan keuntungan bersih Rp ${keuntungan.toLocaleString('id-ID')}.`;
    } else if (keuntungan === 0) {
      summaryTextEl.textContent = '⚖️ Penjualan saat ini pas menutupi modal belanja (Balik Modal / BEP).';
    } else {
      summaryTextEl.textContent = `⏳ Masih butuh penjualan Rp ${Math.abs(keuntungan).toLocaleString('id-ID')} lagi untuk balik modal dari total belanja bahan.`;
    }

    const ctx = document.getElementById('profitChart');
    if (!ctx) return;

    if (profitChartInstance) {
      profitChartInstance.destroy();
    }

    profitChartInstance = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Modal Belanja (Rp)',
            data: modalPerDay,
            backgroundColor: 'rgba(239, 68, 68, 0.75)',
            borderColor: 'rgb(239, 68, 68)',
            borderWidth: 1.5,
            borderRadius: 6,
            maxBarThickness: 16
          },
          {
            label: 'Penjualan (Rp)',
            data: jualPerDay,
            backgroundColor: 'rgba(30, 62, 78, 0.85)',
            borderColor: 'rgb(30, 62, 78)',
            borderWidth: 1.5,
            borderRadius: 6,
            maxBarThickness: 16
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            labels: { boxWidth: 10, boxHeight: 10, font: { size: 10, family: 'Poppins' } }
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                return ` ${context.dataset.label}: Rp ${Number(context.raw || 0).toLocaleString('id-ID')}`;
              }
            }
          }
        },
        scales: {
          x: { grid: { display: false }, ticks: { font: { size: 9, family: 'Poppins' } } },
          y: {
            beginAtZero: true,
            ticks: {
              font: { size: 9, family: 'Poppins' },
              callback: function(value) {
                if (value >= 1000000) return (value / 1000000) + 'jt';
                if (value >= 1000) return (value / 1000) + 'rb';
                return value;
              }
            }
          }
        }
      }
    });
  },

  renderHistoryList(db) {
    const list = [];

    (db.batches || []).forEach(b => {
      list.push({
        id: b.id,
        tipe: 'produksi',
        tanggal: b.tanggal,
        judul: `Masak Jamu (${b.id})`,
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
      const biaya = Number(s.harga_beli) || 0;
      list.push({
        id: s.id,
        tipe: 'stok_masuk',
        tanggal: s.tanggal,
        judul: `Beli Stok ${s.namaBahan}`,
        detail: `+${s.jumlah} ${s.satuan}` + (biaya > 0 ? ` - Modal: Rp ${biaya.toLocaleString('id-ID')}` : ''),
        subdetail: s.catatan || 'Belanja bahan baku'
      });
    });

    list.sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal));

    const listEl = document.getElementById('historyTimelineList');
    listEl.innerHTML = '';
    if (list.length === 0) {
      listEl.innerHTML = '<p class="text-xs text-gray-400 text-center py-6">Belum ada riwayat aktivitas.</p>';
      return;
    }

    list.forEach(item => {
      let iconBg = 'bg-orange-100 text-accent';
      let iconSvg = `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/></svg>`;

      if (item.tipe === 'produksi') {
        iconBg = 'bg-amber-100 text-amber-700';
        iconSvg = `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"/></svg>`;
      } else if (item.tipe === 'konsumsi') {
        iconBg = 'bg-rose-100 text-rose-600';
        iconSvg = `<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clip-rule="evenodd"/></svg>`;
      } else if (item.tipe === 'stok_masuk') {
        iconBg = 'bg-emerald-100 text-emerald-700';
        iconSvg = `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>`;
      }

      let editBtnHtml = '';
      if (item.tipe === 'produksi') {
        editBtnHtml = `<button onclick="App.closeHistoryModal(); App.openEditBatchModal('${item.id}')" class="px-2 py-1 rounded bg-white text-gray-600 hover:text-primary text-[10px] font-bold border border-gray-200">Edit / Hapus</button>`;
      } else if (item.tipe === 'penjualan' || item.tipe === 'konsumsi') {
        editBtnHtml = `<button onclick="App.closeHistoryModal(); App.openEditTrxModal('${item.id}')" class="px-2 py-1 rounded bg-white text-gray-600 hover:text-primary text-[10px] font-bold border border-gray-200">Edit / Hapus</button>`;
      } else if (item.tipe === 'stok_masuk') {
        editBtnHtml = `<button onclick="App.closeHistoryModal(); App.openEditStokMasukModal('${item.id}')" class="px-2 py-1 rounded bg-white text-gray-600 hover:text-primary text-[10px] font-bold border border-gray-200">Edit / Hapus</button>`;
      }

      const card = document.createElement('div');
      card.className = 'p-3 bg-inputBg rounded-card flex gap-3 items-start border border-gray-100';
      card.innerHTML = `
        <div class="w-8 h-8 rounded-full ${iconBg} flex items-center justify-center shrink-0 mt-0.5">
          ${iconSvg}
        </div>
        <div class="flex-1">
          <div class="flex justify-between items-baseline">
            <h4 class="text-xs font-bold text-primary">${item.judul}</h4>
            <span class="text-[10px] text-gray-400">${this.formatDateIndo(item.tanggal)}</span>
          </div>
          <p class="text-xs font-semibold text-gray-700 mt-0.5">${item.detail}</p>
          ${item.subdetail ? `<p class="text-[11px] text-gray-500 mt-1">${item.subdetail}</p>` : ''}
          <div class="mt-2 text-right">
            ${editBtnHtml}
          </div>
        </div>
      `;
      listEl.appendChild(card);
    });
  }
};
