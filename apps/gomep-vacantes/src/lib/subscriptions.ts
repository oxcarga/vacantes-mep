export const SUBSCRIPTION_DURATION_MS = 30 * 24 * 60 * 60 * 1000;

export function subscriptionExpiresAt(createdAt: Date): string {
  return new Date(createdAt.getTime() + SUBSCRIPTION_DURATION_MS).toISOString();
}

export type CreateSubscriptionInput = {
  role: string;
  emailVerified: boolean;
  regionalExists: boolean;
  especialidadExists: boolean;
  hasActivePair: boolean;
};

export function canCreateSubscription(input: CreateSubscriptionInput): {
  ok: boolean;
  error?: string;
} {
  if (!input.emailVerified) {
    return { ok: false, error: "Correo sin verificar" };
  }
  if (input.role !== "docente") {
    return { ok: false, error: "Un admin no puede suscribirse" };
  }
  if (!input.regionalExists || !input.especialidadExists) {
    return { ok: false, error: "Ese par no está en el catálogo" };
  }
  if (input.hasActivePair) {
    return { ok: false, error: "Ya tiene una suscripción activa para ese par" };
  }
  return { ok: true };
}

export function canRemoveSubscription(input: {
  role: string;
  emailVerified: boolean;
  ownerUid: string;
  callerUid: string;
  status: string;
}): { ok: boolean; error?: string } {
  if (!input.emailVerified) {
    return { ok: false, error: "Correo sin verificar" };
  }
  if (input.role !== "docente") {
    return { ok: false, error: "Un admin no puede quitar suscripciones" };
  }
  if (input.ownerUid !== input.callerUid) {
    return { ok: false, error: "Solo puede quitar sus propias suscripciones" };
  }
  if (input.status !== "active") {
    return { ok: false, error: "La suscripción ya está inactiva" };
  }
  return { ok: true };
}
