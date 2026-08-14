import { describe, expect, it } from "vitest";
import { filterLdRequests } from "./LDRequests";

const requests = [
  { id: 1, requestNumber: "LD-0001-26", status: "pending", submittedAt: "2026-08-01 10:00:00", officeName: "TORRES", finalClientName: "AMBEV", workCity: "Rio de Janeiro", workState: "RJ" },
  { id: 2, requestNumber: "LD-0002-26", status: "quote_ready", submittedAt: "2026-08-14 10:00:00", officeName: "ATELIÊ LUZ", finalClientName: "PROENG", workCity: "São Paulo", workState: "SP" },
];

describe("filterLdRequests", () => {
  it("filtra solicitações por status", () => {
    expect(filterLdRequests(requests, { search: "", status: "quote_ready", dateFrom: "", dateTo: "" }).map(request => request.id)).toEqual([2]);
  });

  it("filtra por busca em número, escritório, cliente ou localidade", () => {
    expect(filterLdRequests(requests, { search: "rio", status: "all", dateFrom: "", dateTo: "" }).map(request => request.id)).toEqual([1]);
    expect(filterLdRequests(requests, { search: "0002", status: "all", dateFrom: "", dateTo: "" }).map(request => request.id)).toEqual([2]);
  });

  it("filtra por período informado", () => {
    expect(filterLdRequests(requests, { search: "", status: "all", dateFrom: "2026-08-10", dateTo: "2026-08-31" }).map(request => request.id)).toEqual([2]);
  });
});
