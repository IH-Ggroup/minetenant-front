import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getPurchaseRequestId,
  clearPurchaseRequest,
} from '@/features/checkout/purchase-request';

describe('purchase-request', () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it('初回取得時にrequestIdを生成する', () => {
    const requestId = getPurchaseRequestId('user-1', 'product-1');

    expect(requestId).toMatch(/^[A-Za-z0-9._:-]{1,100}$/);
  });

  it('同じ利用者と商品なら同じrequestIdを返す', () => {
    const first = getPurchaseRequestId('user-1', 'product-1');
    const second = getPurchaseRequestId('user-1', 'product-1');

    expect(second).toBe(first);
  });

  it('異なる商品なら別のrequestIdを生成する', () => {
    const first = getPurchaseRequestId('user-1', 'product-1');
    const second = getPurchaseRequestId('user-1', 'product-2');

    expect(second).not.toBe(first);
  });

  it('異なる利用者なら別のrequestIdを生成する', () => {
    const first = getPurchaseRequestId('user-1', 'product-1');
    const second = getPurchaseRequestId('user-2', 'product-1');

    expect(second).not.toBe(first);
  });

  it('保存値が壊れている場合はrequestIdを再生成する', () => {
    sessionStorage.setItem(
      'minetenant:pending-purchase:user-1:product-1',
      '{invalid-json',
    );

    const requestId = getPurchaseRequestId('user-1', 'product-1');

    expect(requestId).toMatch(/^[A-Za-z0-9._:-]{1,100}$/);
    expect(
      sessionStorage.getItem('minetenant:pending-purchase:user-1:product-1'),
    ).toContain(requestId);
  });

  it('requestIdが一致する場合だけ保存情報を削除する', () => {
    const requestId = getPurchaseRequestId('user-1', 'product-1');

    clearPurchaseRequest('user-1', 'product-1', 'another-request');

    expect(getPurchaseRequestId('user-1', 'product-1')).toBe(requestId);

    clearPurchaseRequest('user-1', 'product-1', requestId);

    const newRequestId = getPurchaseRequestId('user-1', 'product-1');

    expect(newRequestId).not.toBe(requestId);
  });

  it('不正なrequestIdが保存されている場合は再生成する', () => {
    sessionStorage.setItem(
      'minetenant:pending-purchase:user-1:product-1',
      JSON.stringify({
        userId: 'user-1',
        productId: 'product-1',
        requestId: '',
      }),
    );

    const requestId = getPurchaseRequestId('user-1', 'product-1');

    expect(requestId).toMatch(/^[A-Za-z0-9._:-]{1,100}$/);
  });
});
