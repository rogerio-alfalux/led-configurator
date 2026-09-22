const DUPLICATE_KEY_PATTERN = /(?:duplicate entry|er_dup_entry|errno\s*[:=]?\s*1062|sqlstate\s*[:=]?\s*23000|quotes_quotenumber_unique)/i;

/**
 * Drizzle encapsula erros do driver em uma cadeia de `cause`. Este helper percorre
 * a cadeia sem depender da classe concreta do driver MySQL.
 */
export function isDuplicateKeyError(error: unknown): boolean {
  let current: unknown = error;
  const visited = new Set<unknown>();

  for (let depth = 0; current && depth < 8 && !visited.has(current); depth += 1) {
    visited.add(current);
    if (typeof current === "string") return DUPLICATE_KEY_PATTERN.test(current);
    if (typeof current !== "object") return DUPLICATE_KEY_PATTERN.test(String(current));

    const candidate = current as {
      message?: unknown;
      code?: unknown;
      errno?: unknown;
      sqlState?: unknown;
      sqlMessage?: unknown;
      cause?: unknown;
    };
    const details = [candidate.message, candidate.code, candidate.errno, candidate.sqlState, candidate.sqlMessage]
      .filter((value) => value != null)
      .join(" ");
    if (DUPLICATE_KEY_PATTERN.test(details)) return true;
    current = candidate.cause;
  }

  return false;
}
