export function maskEmailForDisplay(value?: string): string {
  const email = value?.trim() ?? '';
  const at = email.indexOf('@');
  if (at <= 0) return email;

  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  const visible = local.slice(0, 1);
  return `${visible}***@${domain}`;
}
