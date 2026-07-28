export const paths = {
  root: '/',
  login: '/login',
  signup: '/signup',
  products: '/products',
  product: (productId: string) => `/products/${productId}`,
  checkout: (productId: string) => `/checkout/${productId}`,
  checkoutReview: (productId: string) => `/checkout/${productId}/review`,
  purchaseComplete: (transactionId: string) =>
    `/purchases/${transactionId}/complete`,
  myPage: '/mypage',
  sell: '/sell',
  sellReview: '/sell/review',
  sellSync: (productId: string) => `/sell/sync/${productId}`,
  sellComplete: (productId: string) => `/sell/complete/${productId}`,
  store: (storeId: string) => `/stores/${storeId}`,
  storeManage: '/store/manage',
} as const;
