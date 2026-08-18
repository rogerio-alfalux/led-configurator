import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("wouter", () => ({
  Link: ({ children }: { children: React.ReactNode }) => createElement("a", null, children),
}));

import { LdRequestNotificationButton } from "./LdRequestNotificationButton";

describe("LdRequestNotificationButton", () => {
  it("mantém um ícone próprio para Solicitações LD", () => {
    const markup = renderToStaticMarkup(createElement(LdRequestNotificationButton, {
      href: "/solicitacoes-ld",
      title: "Solicitações LD",
      count: 2,
      tone: "admin",
    }));

    expect(markup).toContain('data-testid="ld-request-access"');
    expect(markup).toContain('data-testid="ld-request-icon"');
    expect(markup).toContain("lucide-clipboard-list");
  });
});
