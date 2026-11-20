export function benchmarkMetrics(frameMs) {
  if (!frameMs.length || frameMs.some(n => !Number.isFinite(n) || n <= 0)) throw new Error('Positive real frame durations required');
  const sorted = [...frameMs].sort((a, b) => a - b), n = sorted.length, k = Math.max(1, Math.ceil(.01 * n));
  const sum = frameMs.reduce((a, b) => a + b, 0), slowMean = sorted.slice(n - k).reduce((a, b) => a + b, 0) / k;
  // Nearest-rank empirical percentile, explicitly documented.
  return { avg_fps: 1000 * n / sum, p1_low_fps: 1000 / slowMean, frame_ms_p95: sorted[Math.ceil(.95 * n) - 1], frames: n };
}
