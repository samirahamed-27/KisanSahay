import * as SQLite from 'expo-sqlite';
import { Storage } from './storage';

export interface LocalLoanRecord {
  id: string;
  schemeId?: string;
  schemeName: string;
  bankName: string;
  principalAmount: number;
  interestRate: number;
  tenureMonths: number;
  paidAmount: number;
  nextEmiDate?: string;
  status: 'active' | 'ended';
  createdAt: string;
}

let dbInstance: any = null;

export const Database = {
  async init(): Promise<void> {
    try {
      if (SQLite && typeof (SQLite as any).openDatabaseSync === 'function') {
        dbInstance = (SQLite as any).openDatabaseSync('kisansahay.db');
        dbInstance.execSync(`
          CREATE TABLE IF NOT EXISTS loans (
            id TEXT PRIMARY KEY,
            schemeId TEXT,
            schemeName TEXT NOT NULL,
            bankName TEXT,
            principalAmount REAL NOT NULL,
            interestRate REAL NOT NULL,
            tenureMonths INTEGER NOT NULL,
            paidAmount REAL NOT NULL DEFAULT 0,
            nextEmiDate TEXT,
            status TEXT NOT NULL DEFAULT 'active',
            createdAt TEXT NOT NULL
          );
        `);
      }
    } catch (e) {
      console.warn('[Database] SQLite not available in this environment, using AsyncStorage fallback:', e);
    }
  },

  async getAllLoans(): Promise<LocalLoanRecord[]> {
    if (dbInstance) {
      try {
        const rows = dbInstance.getAllSync('SELECT * FROM loans ORDER BY createdAt DESC;');
        return rows as LocalLoanRecord[];
      } catch (e) {
        console.warn('[Database] SQLite query failed, falling back:', e);
      }
    }
    return Storage.get<LocalLoanRecord[]>('kisansahay_loans', []);
  },

  async saveLoan(loan: LocalLoanRecord): Promise<void> {
    if (dbInstance) {
      try {
        dbInstance.runSync(
          `INSERT OR REPLACE INTO loans (id, schemeId, schemeName, bankName, principalAmount, interestRate, tenureMonths, paidAmount, nextEmiDate, status, createdAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
          [
            loan.id,
            loan.schemeId || null,
            loan.schemeName,
            loan.bankName,
            loan.principalAmount,
            loan.interestRate,
            loan.tenureMonths,
            loan.paidAmount,
            loan.nextEmiDate || null,
            loan.status,
            loan.createdAt,
          ]
        );
      } catch (e) {
        console.warn('[Database] SQLite insert failed, falling back:', e);
      }
    }

    // Always maintain AsyncStorage mirror for instant sync
    const current = await Storage.get<LocalLoanRecord[]>('kisansahay_loans', []);
    const index = current.findIndex((l) => l.id === loan.id);
    if (index >= 0) {
      current[index] = loan;
    } else {
      current.unshift(loan);
    }
    await Storage.set('kisansahay_loans', current);
  },

  async deleteLoan(id: string): Promise<void> {
    if (dbInstance) {
      try {
        dbInstance.runSync('DELETE FROM loans WHERE id = ?;', [id]);
      } catch (e) {
        console.warn('[Database] SQLite delete failed:', e);
      }
    }
    const current = await Storage.get<LocalLoanRecord[]>('kisansahay_loans', []);
    const filtered = current.filter((l) => l.id !== id);
    await Storage.set('kisansahay_loans', filtered);
  },
};
