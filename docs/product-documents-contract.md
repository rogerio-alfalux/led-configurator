# Contrato de documentos de produto — API Alfalux

Fonte validada: `/home/ubuntu/upload/LUNA_G_LED_17W_RE.json`, produto `LDE-6450.140.18B` (`LUNA G LED 17W RE`).

```ts
type ApiProductDocument = {
  nome: string;
  mimeType: string;
  url: string;
};

type ApiProductDocuments = {
  datasheet: ApiProductDocument | null;
  fotometria: ApiProductDocument | null;
  desenhoTecnico: ApiProductDocument | null;
};
```

O produto traz a seção `documentos`, com `datasheet`, `fotometria` e `desenhoTecnico`. Também há aliases de URL no nível do produto: `datasheetUrl`, `fotometriaIesUrl` e `desenhoTecnicoUrl`. O Sistema Luna deve priorizar os objetos de `documentos`, pois eles preservam nome e MIME type, usando os aliases apenas como compatibilidade. Os links apontam diretamente para o armazenamento da API e não devem ser copiados nem persistidos localmente.
