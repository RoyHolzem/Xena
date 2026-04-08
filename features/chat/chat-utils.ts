export const cn = (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(' ');

export const makeId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
};
