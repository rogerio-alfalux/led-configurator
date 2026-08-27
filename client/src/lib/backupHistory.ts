export type BackupHistoryRow = {
  id: number;
  createdAt: Date | string;
};

function timestamp(value: Date | string): number {
  return value instanceof Date ? value.getTime() : new Date(value).getTime();
}

/**
 * Insere imediatamente no cache os registros confirmados pelo servidor.
 * A deduplicação por ID mantém o refetch posterior seguro e idempotente.
 */
export function mergeConfirmedBackupRows<T extends BackupHistoryRow>(
  current: T[] | undefined,
  confirmed: T[],
): T[] {
  const byId = new Map<number, T>();
  for (const row of [...confirmed, ...(current ?? [])]) {
    if (!byId.has(row.id)) byId.set(row.id, row);
  }
  return Array.from(byId.values()).sort((a, b) => {
    const timeDifference = timestamp(b.createdAt) - timestamp(a.createdAt);
    return timeDifference || b.id - a.id;
  });
}
