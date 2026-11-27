/** Kích thước làm việc: cạnh dài tối đa 2048 px, hoặc 1536 px trên iOS / máy RAM ≤ 4GB. Không phóng to ảnh nhỏ. */
export function workingSize(srcW: number, srcH: number, env: { isIOS: boolean; deviceMemory?: number }): { width: number; height: number } {
  const max = env.isIOS || (env.deviceMemory !== undefined && env.deviceMemory <= 4) ? 1536 : 2048;
  const long = Math.max(srcW, srcH);
  if (long <= max) return { width: Math.round(srcW), height: Math.round(srcH) };
  const k = max / long;
  return { width: Math.round(srcW * k), height: Math.round(srcH * k) };
}

export function detectEnv(): { isIOS: boolean; deviceMemory?: number } {
  const ua = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (ua.includes('Macintosh') && navigator.maxTouchPoints > 1);
  return { isIOS, deviceMemory: (navigator as any).deviceMemory };
}
