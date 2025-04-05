import sqlite3 from "sqlite3";
import { open } from "sqlite";

async function initDB() {
    const db = await open({
        filename: "./community.db",
        driver: sqlite3.Database,
    });

    await db.exec(`
    CREATE TABLE IF NOT EXISTS wallet_labels (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      wallet_address TEXT NOT NULL,
      label TEXT,
      evidence TEXT,
      submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS alerts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      wallet_address TEXT NOT NULL,
      condition TEXT NOT NULL, -- e.g., "riskScore > 70"
      message TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

    return db;
}

export async function getDB() {
    return await initDB();
}

export async function addWalletLabel(
    walletAddress: string,
    label: string,
    evidence: string,
) {
    const db = await getDB();
    await db.run(
        "INSERT INTO wallet_labels (wallet_address, label, evidence) VALUES (?, ?, ?)",
        [walletAddress, label, evidence],
    );
}

export async function getWalletLabels(walletAddress: string) {
    const db = await getDB();
    return await db.all(
        "SELECT * FROM wallet_labels WHERE wallet_address = ?",
        [walletAddress],
    );
}

export async function addAlert(
    walletAddress: string,
    condition: string,
    message: string,
) {
    const db = await getDB();
    await db.run(
        "INSERT INTO alerts (wallet_address, condition, message) VALUES (?, ?, ?)",
        [walletAddress, condition, message],
    );
}

export async function getAlerts() {
    const db = await getDB();
    return await db.all("SELECT * FROM alerts");
}
