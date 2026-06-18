export function maskPhone(phone: string | null | undefined): string {
  if (!phone || phone.length < 6) return "***";
  const prefix = phone.slice(0, 4);
  const suffix = phone.slice(-4);
  const masked = prefix + "*".repeat(Math.max(0, phone.length - 8)) + suffix;
  return masked;
}
