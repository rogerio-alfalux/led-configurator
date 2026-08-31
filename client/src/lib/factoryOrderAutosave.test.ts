import { describe, expect, it, vi } from "vitest";
import { createFactoryOrderAutosave } from "./factoryOrderAutosave";

describe("createFactoryOrderAutosave", () => {
  it("persiste somente a edição mais recente de cada item após o debounce", async () => {
    vi.useFakeTimers();
    const save = vi.fn(async () => undefined);
    const autosave = createFactoryOrderAutosave(save, 500);

    autosave.schedule(7, "primeira tecla");
    autosave.schedule(7, "texto completo");
    await vi.advanceTimersByTimeAsync(500);

    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith(7, "texto completo");
    vi.useRealTimers();
  });

  it("descarrega imediatamente todos os itens antes de gerar documentos", async () => {
    const save = vi.fn(async () => undefined);
    const autosave = createFactoryOrderAutosave(save, 60_000);
    autosave.schedule(1, "item um");
    autosave.schedule(2, "item dois");

    await autosave.flushAll();

    expect(save).toHaveBeenCalledTimes(2);
    expect(save).toHaveBeenCalledWith(1, "item um");
    expect(save).toHaveBeenCalledWith(2, "item dois");
  });
});
