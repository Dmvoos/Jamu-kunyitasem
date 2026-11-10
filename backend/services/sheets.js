// backend/services/sheets.js - Google Sheets Database Service
const { google } = require('googleapis');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

class SheetsService {
  constructor() {
    this.spreadsheetId = process.env.SPREADSHEET_ID;
    this.auth = null;
    this.sheets = null;
  }

  async init() {
    if (this.sheets) return;

    try {
      const keyFilePath = process.env.GOOGLE_APPLICATION_CREDENTIALS 
        ? path.resolve(process.env.GOOGLE_APPLICATION_CREDENTIALS) 
        : null;

      if (!keyFilePath) {
        console.warn('⚠️ GOOGLE_APPLICATION_CREDENTIALS tidak disetel di .env. Berjalan dalam mode lokal.');
        return;
      }

      this.auth = new google.auth.GoogleAuth({
        keyFile: keyFilePath,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });

      this.sheets = google.sheets({ version: 'v4', auth: this.auth });
      console.log('✅ Google Sheets API Terhubung.');
    } catch (err) {
      console.error('❌ Gagal inisialisasi Google Sheets:', err.message);
    }
  }

  async readSheet(range) {
    await this.init();
    if (!this.sheets || !this.spreadsheetId) return null;

    const res = await this.sheets.spreadsheets.values.get({
      spreadsheetId: this.spreadsheetId,
      range,
    });
    return res.data.values || [];
  }

  async appendRow(range, rowValues) {
    await this.init();
    if (!this.sheets || !this.spreadsheetId) return null;

    return await this.sheets.spreadsheets.values.append({
      spreadsheetId: this.spreadsheetId,
      range,
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: [rowValues],
      },
    });
  }
}

module.exports = new SheetsService();
