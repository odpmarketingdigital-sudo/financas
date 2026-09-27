/**
 * Mescla as categorias padrão (definidas em `src/constants/categories.ts`)
 * com as categorias personalizadas cadastradas pelo usuário no Supabase,
 * removendo duplicatas (comparação sem diferenciar maiúsculas/minúsculas).
 */
export function mergeCategories(
  defaults: readonly string[],
  custom: readonly string[],
): string[] {
  const seen = new Set(defaults.map((name) => name.trim().toLowerCase()));
  const merged = defaults.map((name) => name.trim());

  for (const name of custom) {
    const trimmed = name.trim();
    const key = trimmed.toLowerCase();
    if (!key || seen.has(key)) continue;

    seen.add(key);
    merged.push(trimmed);
  }

  return merged;
}

/** Gera as opções aceitas pelo componente `Select`. */
export function toCategoryOptions(
  categories: readonly string[],
): { value: string; label: string }[] {
  return categories.map((name) => ({ value: name, label: name }));
}
