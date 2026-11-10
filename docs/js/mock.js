// docs/js/mock.js - Data Dummy & Mock Storage Engine untuk GitHub Pages
const MOCK_STORAGE_KEY = 'JAMU_KUNYIT_ASEM_DATA_V2';

const DEFAULT_MOCK_DATA = {
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

const MockDB = {
  load() {
    try {
      const str = localStorage.getItem(MOCK_STORAGE_KEY);
      if (str) return JSON.parse(str);
    } catch (e) {}
    localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(DEFAULT_MOCK_DATA));
    return JSON.parse(JSON.stringify(DEFAULT_MOCK_DATA));
  },

  save(data) {
    try {
      localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(data));
    } catch (e) {}
  },

  reset() {
    localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(DEFAULT_MOCK_DATA));
    return JSON.parse(JSON.stringify(DEFAULT_MOCK_DATA));
  }
};
