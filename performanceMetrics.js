// performanceMetrics.js
// Utility for logging and retrieving performance metrics in the database

import fs from 'fs';
import path from 'path';
import sqlite3 from 'sqlite3';

const DB_PATH = path.resolve(process.cwd(), 'performance_metrics.db');

// Initialize DB and table if not exists
function initDB() {
  const db = new sqlite3.Database(DB_PATH);
  db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS performance_metrics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      operation TEXT,
      duration_ms INTEGER,
      extra TEXT
    )`);
  });
  db.close();
}

export function logMetric(operation, durationMs, extra = null) {
  initDB();
  const db = new sqlite3.Database(DB_PATH);
  db.run(
    'INSERT INTO performance_metrics (operation, duration_ms, extra) VALUES (?, ?, ?)',
    [operation, durationMs, extra ? JSON.stringify(extra) : null],
    err => { if (err) console.error('Metric log error:', err); db.close(); }
  );
}

export function fetchMetrics(limit = 100) {
  initDB();
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(DB_PATH);
    db.all(
      'SELECT * FROM performance_metrics ORDER BY timestamp DESC LIMIT ?',
      [limit],
      (err, rows) => {
        db.close();
        if (err) reject(err);
        else resolve(rows);
      }
    );
  });
}

// Usage example:
// logMetric('parseCSV', 123, { file: 'foo.csv', rows: 1000 });
// fetchMetrics().then(console.log);
