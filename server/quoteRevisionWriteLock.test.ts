import { describe, expect, it } from "vitest";
import { serializeQuoteRevisionWrite } from "./db";

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

describe("serializeQuoteRevisionWrite", () => {
  it("serializa gravações concorrentes do mesmo orçamento", async () => {
    const sequence: string[] = [];

    const first = serializeQuoteRevisionWrite(40444, async () => {
      sequence.push("first:start");
      await wait(15);
      sequence.push("first:end");
      return "first";
    });
    const second = serializeQuoteRevisionWrite(40444, async () => {
      sequence.push("second:start");
      sequence.push("second:end");
      return "second";
    });

    await expect(Promise.all([first, second])).resolves.toEqual(["first", "second"]);
    expect(sequence).toEqual(["first:start", "first:end", "second:start", "second:end"]);
  });

  it("libera a fila após uma falha", async () => {
    await expect(serializeQuoteRevisionWrite(40445, async () => {
      throw new Error("falha esperada");
    })).rejects.toThrow("falha esperada");

    await expect(serializeQuoteRevisionWrite(40445, async () => "recuperado"))
      .resolves.toBe("recuperado");
  });
});
