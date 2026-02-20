export enum AssetType {
  CARRO = 'CARRO',
  CAMINHAO = 'CAMINHAO',
  LANCHA = 'LANCHA',
  MOTO = 'MOTO',
  MAQUINARIO = 'MAQUINARIO',
}

export enum TriggerType {
  KM = 'KM',
  HORAS = 'HORAS',
  DATA = 'DATA',
}

export enum AssetStatus {
  DISPONIVEL = 'DISPONIVEL',
  EM_SERVICO = 'EM_SERVICO',
  EM_MANUTENCAO = 'EM_MANUTENCAO',
  PARADO = 'PARADO',
}

export enum WorkOrderStatus {
  ABERTA = 'ABERTA',
  EM_ANDAMENTO = 'EM_ANDAMENTO',
  AGUARDANDO = 'AGUARDANDO',
  CONCLUIDA = 'CONCLUIDA',
  CANCELADA = 'CANCELADA',
}

export enum WorkOrderPriority {
  BAIXA = 'BAIXA',
  NORMAL = 'NORMAL',
  ALTA = 'ALTA',
  URGENTE = 'URGENTE',
  CRITICA = 'CRITICA',
}

export enum ChecklistRunStatus {
  PENDENTE = 'PENDENTE',
  EM_CURSO = 'EM_CURSO',
  CONCLUIDO = 'CONCLUIDO',
  BLOQUEADO = 'BLOQUEADO',
}

export enum NotificationChannel {
  IN_APP = 'IN_APP',
  PUSH = 'PUSH',
  EMAIL = 'EMAIL',
}

export enum UserRole {
  ADMIN = 'ADMIN',
  GESTOR = 'GESTOR',
  TECNICO = 'TECNICO',
}

export type ApiHealth = {
  ok: boolean;
  timestamp: string;
};
