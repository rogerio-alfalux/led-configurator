import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { generateFilteredQuotesExcel } from "./quotesExcelGenerator";

describe("generateFilteredQuotesExcel", () => {
  it("organiza os orçamentos filtrados, os dados LD e os totais em uma planilha", async () => {
    const buffer = await generateFilteredQuotesExcel([
      {
        quoteNumber: "04.0366-26",
        revisionCount: 0,
        status: "approved",
        createdAt: "2026-07-10 10:00:00",
        updatedAt: "2026-07-12 11:00:00",
        clientName: "PROENG CONSTRUTORA",
        clientContact: "Mariana",
        projectName: "ORATÓRIO",
        projectRef: "REFORMA ESCRITÓRIO",
        seller1Name: "ANALICE COSTA",
        assistantName: "GEYSA",
        freteState: "RJ",
        freteCity: "Rio de Janeiro",
        freteType: "consult",
        totalAmount: 1000,
        totalFinal: 1200,
        ldRequestNumber: "LD-0002-26",
        ldRequestStatus: "quote_ready",
      },
      {
        quoteNumber: "33.0001-26",
        revisionCount: 2,
        status: "open",
        createdAt: "2026-07-15 10:00:00",
        clientName: "CLIENTE DIRETO",
        projectName: "HALL",
        totalAmount: 200,
        totalFinal: 250,
      },
    ], "De: 01/07/2026 | Até: 31/07/2026");

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);
    const sheet = workbook.getWorksheet("Orçamentos filtrados");
    const summary = workbook.getWorksheet("Resumo");

    expect(sheet?.getCell("A1").value).toBe("EXPORTAÇÃO DE ORÇAMENTOS");
    expect(sheet?.getCell("A4").value).toBe("04.0366-26");
    expect(sheet?.getCell("B4").value).toBe("RV0");
    expect(sheet?.getCell("M4").value).toBe("A calcular");
    expect(sheet?.getCell("P4").value).toBe("Solicitação LD");
    expect(sheet?.getCell("Q4").value).toBe("LD-0002-26 — PDF enviado");
    expect(sheet?.getCell("N6").value).toBe(1200);
    expect(sheet?.getCell("O6").value).toBe(1450);
    expect(summary?.getCell("A1").value).toBe("RESUMO DOS ORÇAMENTOS EXPORTADOS");
  });
});
