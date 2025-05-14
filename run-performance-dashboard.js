// run-performance-dashboard.js
// Minimal Express dashboard for performance metrics

import express from 'express';
import { fetchMetrics } from './performanceMetrics.js';

const app = express();
const PORT = 4001;

app.get('/', async (req, res) => {
  const metrics = await fetchMetrics(200);
  let html = `<h1>Performance Metrics Dashboard</h1>`;
  html += `<table border="1" cellpadding="4" style="border-collapse:collapse;font-family:monospace;">
    <tr><th>Timestamp</th><th>Operation</th><th>Duration (ms)</th><th>Extra</th></tr>`;
  for (const m of metrics) {
    html += `<tr><td>${m.timestamp}</td><td>${m.operation}</td><td>${m.duration_ms}</td><td><pre>${m.extra || ''}</pre></td></tr>`;
  }
  html += `</table>`;
  res.send(html);
});

app.listen(PORT, () => {
  console.log(`Performance dashboard running at http://localhost:${PORT}`);
});
