export function sanitizeForTextInsertion(value: string): string {
  // Basic sanitization: ensure string and strip control characters.
  return value.replace(/[\u0000-\u001F\u007F]/g, "");
}
