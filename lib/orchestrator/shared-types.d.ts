// lib/orchestrator/shared-types.d.ts

export interface AIStatus {
  /** Estado actual del subsistema de IA (p.ej. 'idle', 'training', 'degraded', 'offline'). */
  state: string;
  /** Mensaje opcional para diagnóstico humano. */
  message?: string;
  /** Última actualización en ISO 8601. */
  updatedAt?: string;
}

export interface EconomyBalance {
  /** Saldo actual de la economía interna (tokens, créditos, etc.). */
  balance: number;
  /** Moneda o unidad semántica, p.ej. 'TAMV', 'MSR', 'USD'. */
  unit?: string;
  /** Timestamp ISO de cuando se midió este saldo. */
  updatedAt?: string;
}

export interface BlockchainHeight {
  /**
   * Altura actual de la cadena: número de bloques desde el bloque génesis,
   * empezando en 0. [web:140][web:142][web:144][web:146]
   */
  height: number;
  /** Identificador de la red, p.ej. 'msr-mainnet', 'msr-testnet'. */
  network?: string;
  /** Timestamp ISO de la observación. */
  updatedAt?: string;
}
