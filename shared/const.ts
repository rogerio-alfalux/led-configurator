export const COOKIE_NAME = "app_session_id";

/** E-mails com permissão temporária para sobrescrever preços definidos pela API */
export const PRICE_OVERRIDE_EMAILS: string[] = [
  "franciely@grupoalfalux.com.br",
  "camille.batista@grupoalfalux.com.br",
  "vivian@grupoalfalux.com.br",
  "dennis@grupoalfalux.com.br",
];
/**
 * E-mails de gerentes/diretores que:
 * - Podem alterar comissão para qualquer valor (sem limite de 5%)
 * - Veem todos os dados no dashboard
 * - Podem editar metas no dashboard
 */
export const MANAGER_EMAILS: string[] = [
  "vivian@grupoalfalux.com.br",
  "dennis@grupoalfalux.com.br",
  "daniel@grupoalfalux.com.br",
];
/**
 * E-mails com permissão para editar manualmente o preço unitário de drivers nos itens.
 */
export const DRIVER_PRICE_OVERRIDE_EMAILS: string[] = [
  "vivian@grupoalfalux.com.br",
  "dennis@grupoalfalux.com.br",
  "daniel@grupoalfalux.com.br",
];
export const ONE_YEAR_MS = 1000 * 60 * 60 * 24 * 365;
export const AXIOS_TIMEOUT_MS = 30_000;
export const UNAUTHED_ERR_MSG = 'Please login (10001)';
export const NOT_ADMIN_ERR_MSG = 'You do not have required permission (10002)';
