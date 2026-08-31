export interface FactoryOrderAutosave {
  schedule: (itemId: number, itemData: string) => void;
  flush: (itemId: number) => Promise<void>;
  flushAll: () => Promise<void>;
  cancel: (itemId: number) => void;
}

/**
 * Agrupa alterações consecutivas do mesmo item e persiste apenas o estado mais
 * recente. A interface continua otimista; prévia/Excel podem chamar flushAll
 * antes de uma ação que dependa do banco.
 */
export function createFactoryOrderAutosave(
  save: (itemId: number, itemData: string) => Promise<unknown>,
  delayMs = 500,
): FactoryOrderAutosave {
  const timers = new Map<number, ReturnType<typeof setTimeout>>();
  const pending = new Map<number, string>();
  const active = new Set<Promise<void>>();

  const run = (itemId: number): Promise<void> => {
    const itemData = pending.get(itemId);
    if (itemData === undefined) return Promise.resolve();
    pending.delete(itemId);
    const timer = timers.get(itemId);
    if (timer) clearTimeout(timer);
    timers.delete(itemId);
    const operation = Promise.resolve(save(itemId, itemData)).then(() => undefined);
    active.add(operation);
    operation.then(
      () => active.delete(operation),
      () => active.delete(operation),
    );
    return operation;
  };

  return {
    schedule(itemId, itemData) {
      pending.set(itemId, itemData);
      const previous = timers.get(itemId);
      if (previous) clearTimeout(previous);
      timers.set(itemId, setTimeout(() => { void run(itemId).catch(() => undefined); }, delayMs));
    },
    flush: run,
    async flushAll() {
      await Promise.all(Array.from(pending.keys(), itemId => run(itemId)));
      if (active.size > 0) await Promise.all(Array.from(active));
    },
    cancel(itemId) {
      const timer = timers.get(itemId);
      if (timer) clearTimeout(timer);
      timers.delete(itemId);
      pending.delete(itemId);
    },
  };
}
