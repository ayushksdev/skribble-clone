export function sanitizeText(text: string, maxLength: number = 200): string {
  if (typeof text !== 'string') return '';
  return text
    .replace(/[<>]/g, '') // strip html tags
    .trim()
    .slice(0, maxLength);
}

export function sanitizePlayerName(name: string): string {
  if (typeof name !== 'string') return 'Player';
  const clean = name.replace(/[^a-zA-Z0-9_\s-]/g, '').trim().slice(0, 16);
  return clean || 'Player';
}
