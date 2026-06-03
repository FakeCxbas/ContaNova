export type PaymentEvidenceMeta = {
  url: string;
  name: string;
  type: string;
};

const PAYMENT_EVIDENCE_MARKER = "[ContaNovaAdjunto]";

export function buildPaymentNote(note: string, evidence?: PaymentEvidenceMeta | null) {
  const cleanNote = note.trim();
  if (!evidence) return cleanNote;
  const payload = `${PAYMENT_EVIDENCE_MARKER}${JSON.stringify(evidence)}`;
  return cleanNote ? `${cleanNote}\n\n${payload}` : payload;
}

export function parsePaymentNote(rawNote?: string | null) {
  const note = rawNote || "";
  const markerIndex = note.indexOf(PAYMENT_EVIDENCE_MARKER);

  if (markerIndex === -1) {
    return {
      note: note.trim(),
      evidence: null as PaymentEvidenceMeta | null,
    };
  }

  const visibleNote = note.slice(0, markerIndex).trim();
  const metaRaw = note.slice(markerIndex + PAYMENT_EVIDENCE_MARKER.length).trim();

  try {
    const parsed = JSON.parse(metaRaw) as PaymentEvidenceMeta;
    if (!parsed?.url) {
      return { note: visibleNote, evidence: null as PaymentEvidenceMeta | null };
    }
    return { note: visibleNote, evidence: parsed };
  } catch {
    return {
      note: note.trim(),
      evidence: null as PaymentEvidenceMeta | null,
    };
  }
}

export function isPaymentEvidenceImage(type?: string | null) {
  return Boolean(type && type.startsWith("image/"));
}
