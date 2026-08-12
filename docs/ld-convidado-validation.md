# Revisão de isolamento — LD Convidado

Esta revisão cobre exclusivamente as superfícies que um usuário com o papel **LD Convidado** pode alcançar no fluxo de solicitação de orçamento.

| Superfície | Resultado da revisão | Proteção aplicada |
|---|---|---|
| Configurador (`Home.tsx`) | As categorias restritas permanecem ocultas e todas as áreas de preço existentes são condicionadas por `!isConvidado`. | O LD pode configurar produtos e incluir itens no carrinho, sem renderização de preço, custo ou total. |
| Carrinho (`GuestCart`) | O componente dedicado só apresenta SKU, descrição, configurações, composição, foto e quantidade. | Não referencia `formatBRL`, preço unitário, total ou campos de custo. |
| Envio de solicitação | Recebe apenas Escritório, Cliente final e Construtora opcional. | A solicitação preserva a configuração para análise interna, sem revelar valores na interface do convidado. |
| Histórico (`LDGuestRequests`) | Mostra identificadores do projeto, status, data e o botão de PDF após validação. | Não renderiza qualquer campo monetário; o PDF é recuperado apenas para o proprietário da solicitação. |
| Rotas comerciais de orçamento | Listagem, detalhe, revisão, cálculo, status, exportação e demais operações comerciais usam `commercialQuoteProcedure`. | O servidor retorna `FORBIDDEN` para o papel `convidado`, inclusive por acesso direto de URL/API. |
| Fluxo interno | Administrador, assistente e vendedor continuam autorizados pela política comercial existente. | Teste unitário confirma que esses papéis mantêm acesso, enquanto LD Convidado é bloqueado. |

Os testes `ldGuestUiIsolation.test.ts`, `ldRequestUtils.test.ts` e `guestCommercialAccess.test.ts` complementam a revisão com verificações automatizadas das barreiras de interface, disponibilidade de PDF e acesso comercial.
