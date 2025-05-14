// resourceMonitor.js
// Periodically logs CPU and memory usage, alerts if thresholds exceeded

const MEMORY_LIMIT_MB = 800; // Example: 800MB
const CPU_LIMIT_PERCENT = 90; // Example: 90% (over interval)
const CHECK_INTERVAL_MS = 10000; // 10 seconds

let lastCPU = process.cpuUsage();
let lastTime = Date.now();

function logResourceUsageAlert(context, memMB, cpuPercent) {
  const msg = `[ALERT] [${context}] High resource usage: Memory ${memMB.toFixed(1)}MB, CPU ${cpuPercent.toFixed(1)}%`;
  console.warn(msg);
}

function checkResources() {
  const mem = process.memoryUsage();
  const memMB = mem.rss / 1024 / 1024;
  const now = Date.now();
  const cpu = process.cpuUsage();
  const elapsedMS = now - lastTime;
  const elapsedCPU = (cpu.user + cpu.system - lastCPU.user - lastCPU.system) / 1000; // ms
  const cpuPercent = (elapsedCPU / elapsedMS) * 100;
  if (memMB > MEMORY_LIMIT_MB || cpuPercent > CPU_LIMIT_PERCENT) {
    logResourceUsageAlert('resourceMonitor', memMB, cpuPercent);
  } else {
    console.log(`[resourceMonitor] Memory: ${memMB.toFixed(1)}MB, CPU: ${cpuPercent.toFixed(1)}%`);
  }
  lastCPU = cpu;
  lastTime = now;
}

setInterval(checkResources, CHECK_INTERVAL_MS);
console.log('Resource monitor started.');
