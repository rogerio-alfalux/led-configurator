/**
 * Permissões granulares do sistema.
 * Cada permissão pode ser atribuída individualmente a qualquer usuário.
 */
export const PERMISSIONS = {
  /** Pode sobrescrever preços de produtos vindos da API */
  EDITAR_PRECOS: "editar_precos",
  /** Pode editar preço unitário de drivers */
  EDITAR_PRECOS_DRIVER: "editar_precos_driver",
  /** Pode ver custos, markup e dashboard de lucro por orçamento */
  VER_CUSTOS: "ver_custos",
  /** Pode definir/alterar descontos globais e por item */
  EDITAR_DESCONTOS: "editar_descontos",
  /** Pode ver e editar comissão sem limite (gerente) */
  EDITAR_COMISSAO: "editar_comissao",
  /** Pode acessar o dashboard gerencial */
  VER_DASHBOARD: "ver_dashboard",
  /** Pode editar metas de faturamento no dashboard */
  EDITAR_METAS: "editar_metas",
  /** Pode editar markup de luminária */
  EDITAR_MARKUP: "editar_markup",
  /** Pode editar e administrar qualquer orçamento, independentemente do vínculo comercial */
  GERENCIAR_ORCAMENTOS: "gerenciar_orcamentos",
  /** Pode converter, cancelar e vincular pedidos de amostra e manutenção */
  GERENCIAR_AMOSTRAS: "gerenciar_amostras",
  /** Pode classificar um orçamento como duplicado manualmente */
  MARCAR_DUPLICADOS_MANUALMENTE: "marcar_duplicados_manualmente",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const ALL_PERMISSIONS: { key: Permission; label: string; description: string }[] = [
  { key: PERMISSIONS.EDITAR_PRECOS, label: "Editar Preços", description: "Sobrescrever preços de produtos da API" },
  { key: PERMISSIONS.EDITAR_PRECOS_DRIVER, label: "Editar Preços Driver", description: "Editar preço unitário de drivers" },
  { key: PERMISSIONS.VER_CUSTOS, label: "Ver Custos/Lucro", description: "Ver custos, markup e dashboard de lucro" },
  { key: PERMISSIONS.EDITAR_DESCONTOS, label: "Editar Descontos", description: "Definir/alterar descontos globais e por item" },
  { key: PERMISSIONS.EDITAR_COMISSAO, label: "Editar Comissão", description: "Ver e editar comissão sem limite" },
  { key: PERMISSIONS.VER_DASHBOARD, label: "Ver Dashboard", description: "Acessar o dashboard gerencial" },
  { key: PERMISSIONS.EDITAR_METAS, label: "Editar Metas", description: "Editar metas de faturamento" },
  { key: PERMISSIONS.EDITAR_MARKUP, label: "Editar Markup", description: "Editar markup de luminária" },
  { key: PERMISSIONS.GERENCIAR_ORCAMENTOS, label: "Gerenciar Orçamentos", description: "Editar, excluir e revisar qualquer orçamento" },
  { key: PERMISSIONS.GERENCIAR_AMOSTRAS, label: "Gerenciar Amostras e Manutenções", description: "Converter, cancelar e vincular pedidos sem cobrança" },
  { key: PERMISSIONS.MARCAR_DUPLICADOS_MANUALMENTE, label: "Marcar Duplicados Manuais", description: "Classificar ou remover a classificação manual de orçamento duplicado" },
];
