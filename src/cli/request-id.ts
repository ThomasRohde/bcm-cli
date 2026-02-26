export function generateRequestId(): string {
  const now = new Date();
  const y = now.getFullYear();
  const mo = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const h = String(now.getHours()).padStart(2, "0");
  const mi = String(now.getMinutes()).padStart(2, "0");
  const s = String(now.getSeconds()).padStart(2, "0");
  const hex = Math.floor(Math.random() * 0xffff)
    .toString(16)
    .padStart(4, "0");
  return `req_${y}${mo}${d}_${h}${mi}${s}_${hex}`;
}
