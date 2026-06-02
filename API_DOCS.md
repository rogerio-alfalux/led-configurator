# API REST — Configurador Alfalux

## Visão Geral

A API REST do Configurador Alfalux permite que sistemas externos **leiam** os dados de orçamentos em formato JSON. Todas as operações são somente-leitura (GET). Não é possível criar, editar ou excluir orçamentos via API.

**URL base (produção):** `https://seu-dominio.manus.space/api/v1`

---

## Autenticação

Todas as requisições devem incluir um **Bearer Token** no header `Authorization`:

```
Authorization: Bearer alfalux_xxxxxxxxxxxxxxxxxxxx
```

As chaves são gerenciadas em **Painel Admin → API Keys** (acesso restrito a administradores).

---

## Endpoints

### `GET /api/v1/quotes`

Retorna a lista paginada de orçamentos.

**Query parameters:**

| Parâmetro | Tipo    | Padrão | Descrição                                         |
|-----------|---------|--------|---------------------------------------------------|
| `page`    | integer | `1`    | Número da página (começa em 1)                    |
| `limit`   | integer | `50`   | Itens por página (máximo: 200)                    |
| `status`  | string  | —      | Filtrar por status: `Em Aberto`, `Aprovado`, etc. |

**Exemplo de requisição:**

```bash
curl -H "Authorization: Bearer alfalux_xxxxxxxxxxxxxxxxxxxx" \
  "https://seu-dominio.manus.space/api/v1/quotes?page=1&limit=20"
```

**Exemplo de resposta:**

```json
{
  "data": [
    {
      "id": 1,
      "quoteNumber": "33.0001-26",
      "clientName": "ALFALUX",
      "projectName": "SHOWROOM",
      "status": "Em Aberto",
      "totalAmount": 3434.00,
      "totalFinal": 3815.56,
      "currentVersion": 2,
      "rtPercent": "0.1000",
      "marginPercent": "0.0000",
      "seller1Name": "VIVIAN FRANCESCHINELLI",
      "seller2Name": null,
      "assistantName": "BEATRIZ CALDERON",
      "createdAt": "2026-04-22T20:21:37.000Z",
      "updatedAt": "2026-06-01T19:49:19.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 42,
    "totalPages": 3
  }
}
```

---

### `GET /api/v1/quotes/:id`

Retorna os detalhes completos de um orçamento, incluindo todos os itens e o histórico de revisões.

**Parâmetros de rota:**

| Parâmetro | Tipo    | Descrição                   |
|-----------|---------|-----------------------------|
| `id`      | integer | ID numérico do orçamento    |

**Exemplo de requisição:**

```bash
curl -H "Authorization: Bearer alfalux_xxxxxxxxxxxxxxxxxxxx" \
  "https://seu-dominio.manus.space/api/v1/quotes/1"
```

**Exemplo de resposta:**

```json
{
  "id": 1,
  "quoteNumber": "33.0001-26",
  "clientName": "ALFALUX",
  "projectName": "SHOWROOM",
  "status": "Em Aberto",
  "totalAmount": 3434.00,
  "totalFinal": 3815.56,
  "currentVersion": 2,
  "rtPercent": "0.1000",
  "marginPercent": "0.0000",
  "rtDest1": "BEATRIZ CALDERON",
  "rtDest2": null,
  "rtDest3": null,
  "freteType": "standard",
  "freteIsento": false,
  "freteLocalidade": null,
  "seller1Name": "VIVIAN FRANCESCHINELLI",
  "seller2Name": null,
  "assistantName": "BEATRIZ CALDERON",
  "createdAt": "2026-04-22T20:21:37.000Z",
  "updatedAt": "2026-06-01T19:49:19.000Z",
  "items": [
    {
      "id": 1,
      "itemNumber": "L1",
      "productCode": "RV00020",
      "productName": "LUMINARIA EMB CIR ORIENTAVEL F/PLANA DICROICA GU10 D105MM GZ-BM BFM",
      "category": "Revenda",
      "quantity": 5,
      "unitPrice": 178.45,
      "totalPrice": 892.25,
      "unitPriceFinal": 196.30,
      "totalPriceFinal": 981.48,
      "cct": null,
      "power": null,
      "color": null,
      "dimming": "ON/OFF",
      "voltage": null,
      "length": null,
      "itemNote": "INTERLIGHT ref: IL0073-GZ-BM",
      "priceFromApi": false,
      "itemData": { ... }
    }
  ],
  "versions": [
    {
      "id": 1,
      "version": 1,
      "totalAmount": 3434.00,
      "totalFinal": 3815.56,
      "itemCount": 5,
      "createdAt": "2026-04-22T20:21:37.000Z"
    }
  ]
}
```

---

## Campos de Preço

| Campo           | Descrição                                              |
|-----------------|--------------------------------------------------------|
| `totalAmount`   | Subtotal bruto (sem RT e sem Margem)                   |
| `totalFinal`    | Valor final ao cliente (com RT e Margem aplicados)     |
| `unitPrice`     | Preço unitário bruto do item                           |
| `unitPriceFinal`| Preço unitário com RT+Margem aplicados                 |
| `totalPrice`    | Total bruto do item (unitPrice × quantity)             |
| `totalPriceFinal`| Total final do item (com RT+Margem)                   |

---

## Códigos de Erro

| Código | Descrição                                               |
|--------|---------------------------------------------------------|
| `401`  | Chave de API ausente, inválida ou revogada              |
| `404`  | Orçamento não encontrado                                |
| `500`  | Erro interno do servidor                                |

---

## Gerenciamento de Chaves

As chaves de API são gerenciadas em **Painel Admin → API Keys** (rota `/api-keys`). Apenas administradores podem criar ou revogar chaves. Cada chave é exibida **uma única vez** no momento da criação — guarde-a em local seguro.
