export function maskEmail(value: string | null | undefined) {
  if (!value) return value;
  const parts = value.split('@');
  if (parts.length !== 2 || !parts[0] || !parts[1] || /\s/u.test(value))
    return '***';
  return `${Array.from(parts[0]).length > 1 ? Array.from(parts[0])[0] : ''}***@${parts[1]}`;
}
export function maskPhone(value: string | null | undefined) {
  if (!value) return value;
  const digits = value.replace(/\D/g, '');
  return digits.length > 4 ? '***' + digits.slice(-4) : '***';
}
