# Mapa de Permissões — Sistema Luna (Configurador LED Alfalux)

## Roles do Sistema

O sistema possui 5 roles definidos no banco de dados:

| Role | Descrição |
|------|-----------|
| **admin** | Acesso total ao sistema. Atribuído automaticamente para e-mails na lista ADMIN_EMAILS. |
| **gerente** | Acesso gerencial: dashboard completo, edição de metas, comissões sem limite, preços. |
| **vendedor** | Acesso padrão de vendas: configurar produtos, criar/editar orçamentos, ver comissão própria. |
| **assistente** | Acesso restrito: apenas orçamentos do vendedor vinculado. Sem dashboard. |
| **user** | Role padrão atribuído no primeiro login. Mesmo acesso que vendedor na prática. |

---

## Usuários Ativos e Seus Roles (banco de dados)

| Nome | E-mail | Role (DB) |
|------|--------|-----------|
| Cosmos Band (Rogério) | rogeriojohnwayne@gmail.com | admin |
| Rogerio Torres | rogerio@grupoalfalux.com.br | admin |
| Todos os demais (@grupoalfalux) | — | user |

> **Nota:** Embora a maioria esteja com role "user" no banco, as permissões reais são controladas por **listas de e-mail** no código (`shared/const.ts`), não apenas pelo role.

---

## Listas de Permissão por E-mail

### PRICE_OVERRIDE_EMAILS — Sobrescrever preços da API
Podem editar manualmente o preço unitário de produtos (mesmo quando vem da API).

| E-mail |
|--------|
| franciely@grupoalfalux.com.br |
| camille.batista@grupoalfalux.com.br |
| vivian@grupoalfalux.com.br |
| dennis@grupoalfalux.com.br |

### MANAGER_EMAILS — Gestores/Diretores
Podem: alterar comissão sem limite de 5%, ver todos os dados no dashboard, editar metas, ver comissão de todos os orçamentos.

| E-mail |
|--------|
| vivian@grupoalfalux.com.br |
| dennis@grupoalfalux.com.br |
| daniel@grupoalfalux.com.br |

### DRIVER_PRICE_OVERRIDE_EMAILS — Editar preço de drivers
Podem editar manualmente o preço unitário de drivers nos itens do orçamento.

| E-mail |
|--------|
| vivian@grupoalfalux.com.br |
| dennis@grupoalfalux.com.br |
| daniel@grupoalfalux.com.br |

### COST_PRIVILEGED_EMAILS — Ver/editar custos e lucro
Podem ver custo unitário, markup de itens especiais, e acessar o dashboard de lucro por orçamento.

| E-mail |
|--------|
| vivian@grupoalfalux.com.br |
| dennis@grupoalfalux.com.br |
| rogeriojohnwayne@gmail.com |
| rogerio@grupoalfalux.com.br |

### DISCOUNT_EDITORS_EMAILS — Editar descontos
Podem definir/alterar o desconto global e por item nos orçamentos.

| E-mail |
|--------|
| vivian@grupoalfalux.com.br |
| dennis@grupoalfalux.com.br |
| rogeriojohnwayne@gmail.com |
| rogerio@grupoalfalux.com.br |

### ADMIN_EMAILS — Administradores do sistema
Acesso total: painel admin, backup, API keys, gerenciamento de usuários, exportação SQL.

| E-mail |
|--------|
| rogeriojohnwayne@gmail.com |
| rogerio@grupoalfalux.com.br |

### Usuários Externos com Acesso

| E-mail | Tipo | Observação |
|--------|------|------------|
| pab@besten.com.br | Visualizador (user) | Pablo — acesso externo |
| lilian.alfalux@gmail.com | Visualizador (user) | Lilian Jardim — vendedora externa (prefixo 34) |
| orcamentos.qualy@outlook.com | Assistente | Leandro Dantas — assistente externo (Izabel Simon) |

---

## Matriz de Permissões por Funcionalidade

| Funcionalidade | admin | gerente / MANAGER_EMAILS | vendedor / user | assistente |
|----------------|-------|--------------------------|-----------------|------------|
| **Configurador (Home)** | ✅ | ✅ | ✅ | ✅ |
| **Carrinho** | ✅ | ✅ | ✅ | ✅ |
| **Criar orçamento** | ✅ | ✅ | ✅ | ✅ |
| **Editar orçamento** | ✅ | ✅ | Apenas os próprios (seller/criador) | Apenas do vendedor vinculado |
| **Ver todos os orçamentos** | ✅ | ✅ | ✅ | Apenas do vendedor vinculado |
| **Aprovar orçamento** | ✅ | ✅ | ✅ | ✅ |
| **Excluir orçamento** | ✅ | ✅ | Apenas os próprios | Apenas do vendedor vinculado |
| **Duplicar orçamento** | ✅ | ✅ | ✅ | ✅ |
| **Pedido de Fábrica** | ✅ | ✅ | ✅ | ✅ |
| **Dashboard Gerencial** | ✅ | ✅ | ❌ | ❌ |
| **Editar metas (dashboard)** | ✅ | ❌ | ❌ | ❌ |
| **Ver comissão (orçamento)** | ✅ | ✅ | Apenas a própria (somente leitura) | ❌ |
| **Editar comissão** | ✅ | ✅ (sem limite de 5%) | ❌ | ❌ |
| **Editar preço produto (API)** | ✅ | ✅ | Apenas PRICE_OVERRIDE_EMAILS | ❌ |
| **Editar preço driver** | ✅ | DRIVER_PRICE_OVERRIDE_EMAILS | DRIVER_PRICE_OVERRIDE_EMAILS | ❌ |
| **Editar markup** | ✅ | ✅ | ❌ | ❌ |
| **Ver custo/lucro** | ✅ | COST_PRIVILEGED_EMAILS | ❌ | ❌ |
| **Editar desconto** | ✅ | DISCOUNT_EDITORS_EMAILS | ❌ | ❌ |
| **Painel Admin** | ✅ | ❌ | ❌ | ❌ |
| **Backup/Exportação** | ✅ | ❌ | ❌ | ❌ |
| **API Keys** | ✅ | ❌ | ❌ | ❌ |
| **Gerenciar usuários** | ✅ | ❌ | ❌ | ❌ |

---

## Regras de Acesso ao Sistema

1. **Domínio permitido:** Qualquer e-mail `@grupoalfalux.*` tem acesso automático.
2. **Exceções externas:** E-mails listados em `EXCEPTION_ASSISTANT_EMAILS` e `EXCEPTION_VIEWER_EMAILS` também têm acesso.
3. **Role automático no login:**
   - E-mails em `ADMIN_EMAILS` → role `admin`
   - E-mails em `EXCEPTION_ASSISTANT_EMAILS` → role `assistente`
   - Demais → role `user` (padrão)
4. **Assistentes vinculados:** Um assistente pode ser vinculado a um vendedor específico (tabela `assistants`). Quando vinculado, só vê orçamentos desse vendedor.

---

## Como Alterar Permissões

- **Mudar role de um usuário:** Painel Admin → lista de usuários → alterar role (apenas admins).
- **Adicionar e-mail a uma lista de permissão:** Editar `shared/const.ts` no código-fonte.
- **Adicionar usuário externo:** Editar `EXCEPTION_VIEWER_EMAILS` ou `EXCEPTION_ASSISTANT_EMAILS` em `server/db.ts`.
- **Vincular assistente a vendedor:** Tabela `assistants` no banco de dados (campo `allowedSellerId`).
