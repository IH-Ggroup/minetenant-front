export interface CheckoutDraft {
  name: string;
  postalCode: string;
  address: string;
  paymentMethod: 'demo';
}

export const DEFAULT_CHECKOUT_DRAFT: CheckoutDraft = {
  name: '',
  postalCode: '100-0001',
  address: '東京都デモ区ブロック1-2-3',
  paymentMethod: 'demo',
};
