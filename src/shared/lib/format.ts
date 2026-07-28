import type {
  ProductCategory,
  PurchaseSource,
  Transaction,
} from '@/domain/models';

const currencyFormatter = new Intl.NumberFormat('ja-JP', {
  style: 'currency',
  currency: 'JPY',
  maximumFractionDigits: 0,
});

const dateFormatter = new Intl.DateTimeFormat('ja-JP', {
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

export const categoryLabels: Record<ProductCategory, string> = {
  fashion: 'ファッション',
  interior: 'インテリア',
  hobby: 'ホビー',
  accessory: 'アクセサリー',
  tool: '道具',
};

export const purchaseSourceLabels: Record<PurchaseSource, string> = {
  web: 'Web',
  minecraft: 'Minecraft',
};

export function formatPrice(price: number): string {
  return currencyFormatter.format(price);
}

export function formatDateTime(value: string): string {
  return dateFormatter.format(new Date(value));
}

export function transactionStatusLabel(status: Transaction['status']): string {
  const labels: Record<Transaction['status'], string> = {
    paid: '購入完了',
    shipping: '発送準備中',
    complete: '取引完了',
  };
  return labels[status];
}
