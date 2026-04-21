export interface AdaptedPayload {
  payload: Record<string, unknown>;
  sourceEventId: string | null;
  mentoriaId: string | null;
}

function pickString(
  value: unknown,
  ...keys: string[]
): string | null {
  if (!value || typeof value !== "object") return null;
  const obj = value as Record<string, unknown>;
  for (const key of keys) {
    const candidate = obj[key];
    if (typeof candidate === "string" && candidate.trim().length > 0) {
      return candidate;
    }
    if (typeof candidate === "number") {
      return String(candidate);
    }
  }
  return null;
}

export function adaptFluxonPayload(raw: unknown): AdaptedPayload {
  const payload =
    raw && typeof raw === "object" && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : { payload: raw };

  const event =
    payload.event && typeof payload.event === "object"
      ? (payload.event as Record<string, unknown>)
      : payload;

  const sourceEventId =
    pickString(payload, "event_id", "id") ??
    pickString(event, "id", "event_id", "external_id");

  const mentoriaId =
    pickString(payload, "mentoria_id") ??
    pickString(event, "mentoria_id", "mentoriaId");

  return { payload, sourceEventId, mentoriaId };
}
