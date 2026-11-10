import type { ListingDraft } from '@/domain/models';

const STORAGE_KEY = 'minetenant:pending-listing';

interface PendingListing {
  fingerprint: string;
  requestId: string;
}

function fingerprint(draft: ListingDraft): string {
  return JSON.stringify([
    draft.name,
    draft.description,
    draft.price,
    draft.category,
    draft.theme,
    draft.emoji,
  ]);
}

export function getListingRequestId(draft: ListingDraft): string {
  const currentFingerprint = fingerprint(draft);
  const stored = sessionStorage.getItem(STORAGE_KEY);

  if (stored) {
    try {
      const pending = JSON.parse(stored) as PendingListing;

      if (
        pending.fingerprint === currentFingerprint &&
        typeof pending.requestId === 'string' &&
        /^[A-Za-z0-9._:-]{1,100}$/.test(pending.requestId)
      ) {
        return pending.requestId;
      }
    } catch {
      // 保存データが不正なら新しいIDを発行する
    }
  }

  const requestId = crypto.randomUUID();

  sessionStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      fingerprint: currentFingerprint,
      requestId,
    }),
  );

  return requestId;
}

export function clearListingRequest(requestId: string): void {
  const stored = sessionStorage.getItem(STORAGE_KEY);
  if (!stored) return;

  try {
    const pending = JSON.parse(stored) as PendingListing;

    if (pending.requestId === requestId) {
      sessionStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    sessionStorage.removeItem(STORAGE_KEY);
  }
}
