interface PendingPurchase {
  userId: string;
  productId: string;
  requestId: string;
}

function getStorageKey(userId: string, productId: string): string {
  return `minetenant:pending-purchase:${userId}:${productId}`;
}

export function getPurchaseRequestId(
  userId: string,
  productId: string,
): string {
  const storageKey = getStorageKey(userId, productId);
  const stored = sessionStorage.getItem(storageKey);

  if (stored) {
    try {
      const pending = JSON.parse(stored) as PendingPurchase;

      if (
        pending.userId === userId &&
        pending.productId === productId &&
        typeof pending.requestId === 'string' &&
        /^[A-Za-z0-9._:-]{1,100}$/.test(pending.requestId)
      ) {
        return pending.requestId;
      }
    } catch {
      const requestId = crypto.randomUUID();

      sessionStorage.setItem(
        storageKey,
        JSON.stringify({
          userId,
          productId,
          requestId,
        }),
      );

      return requestId;
    }
  }

  const requestId = crypto.randomUUID();

  sessionStorage.setItem(
    storageKey,
    JSON.stringify({
      userId,
      productId,
      requestId,
    }),
  );

  return requestId;
}

export function clearPurchaseRequest(
  userId: string,
  productId: string,
  requestId: string,
): void {
  const storageKey = getStorageKey(userId, productId);
  const stored = sessionStorage.getItem(storageKey);

  if (!stored) return;

  try {
    const pending = JSON.parse(stored) as PendingPurchase;

    if (
      pending.userId === userId &&
      pending.productId === productId &&
      pending.requestId === requestId
    ) {
      sessionStorage.removeItem(storageKey);
    }
  } catch {
    sessionStorage.removeItem(storageKey);
  }
}
