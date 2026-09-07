const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const amount = value => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1_000_000_000;
export function validateDraft(key, saved, initial) {
  if (saved == null) return initial;
  if (key === 'step') return ['items', 'people', 'assign', 'summary'].includes(saved) ? saved : initial;
  if (key.endsWith('Mode')) return ['percent', 'amount'].includes(saved) ? saved : initial;
  if (key.endsWith('Value')) return amount(saved) ? saved : initial;
  if (key === 'items' || key === 'people') {
    if (!Array.isArray(saved)) return initial;
    const seen = new Set();
    return saved.filter(entry => {
      if (!record(entry) || typeof entry.id !== 'string' || !entry.id || seen.has(entry.id) || typeof entry.name !== 'string') return false;
      if (key === 'items' && !amount(entry.price)) return false;
      if (key === 'people' && (!entry.name.trim() || typeof entry.color !== 'string')) return false;
      seen.add(entry.id);
      return true;
    });
  }
  if (key === 'assignments') return record(saved) ? Object.fromEntries(Object.entries(saved).filter(([, ids]) => Array.isArray(ids)).map(([id, ids]) => [id, ids.filter(p => typeof p === 'string')])) : initial;
  return typeof saved === typeof initial ? saved : initial;
}
