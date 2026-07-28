import {
  createBrowserRouter,
  Navigate,
  type RouteObject,
} from 'react-router-dom';

import { AppRouterRoot } from '@/app/AppRouterRoot';
import { paths } from '@/app/paths';
import { MyPage } from '@/features/account/pages/MyPage';
import { StoreManagePage } from '@/features/account/pages/StoreManagePage';
import { StorePage } from '@/features/account/pages/StorePage';
import { TransactionPage } from '@/features/account/pages/TransactionPage';
import { AuthPage } from '@/features/auth/pages/AuthPage';
import { ProductDetailPage } from '@/features/catalog/pages/ProductDetailPage';
import { ProductListPage } from '@/features/catalog/pages/ProductListPage';
import { CheckoutPage } from '@/features/checkout/pages/CheckoutPage';
import { CheckoutReviewPage } from '@/features/checkout/pages/CheckoutReviewPage';
import { PurchaseCompletePage } from '@/features/checkout/pages/PurchaseCompletePage';
import { SellCompletePage } from '@/features/listing/pages/SellCompletePage';
import { SellPage } from '@/features/listing/pages/SellPage';
import { SellReviewPage } from '@/features/listing/pages/SellReviewPage';
import { SellSyncPage } from '@/features/listing/pages/SellSyncPage';
import { NotFoundPage } from '@/features/system/pages/NotFoundPage';
import { AppLayout } from '@/layouts/AppLayout';
import { AuthLayout } from '@/layouts/AuthLayout';

export const routeObjects: RouteObject[] = [
  {
    path: paths.root,
    element: <AppRouterRoot />,
    children: [
      {
        index: true,
        element: <Navigate to={paths.login} replace />,
      },
      {
        element: <AuthLayout />,
        children: [
          { path: 'login', element: <AuthPage /> },
          { path: 'signup', element: <AuthPage /> },
        ],
      },
      {
        element: <AppLayout />,
        children: [
          { path: 'products', element: <ProductListPage /> },
          { path: 'products/:productId', element: <ProductDetailPage /> },
          { path: 'checkout/:productId', element: <CheckoutPage /> },
          {
            path: 'checkout/:productId/review',
            element: <CheckoutReviewPage />,
          },
          {
            path: 'purchases/:transactionId/complete',
            element: <PurchaseCompletePage />,
          },
          { path: 'mypage', element: <MyPage /> },
          { path: 'sell', element: <SellPage /> },
          { path: 'sell/review', element: <SellReviewPage /> },
          { path: 'sell/sync/:productId', element: <SellSyncPage /> },
          {
            path: 'sell/complete/:productId',
            element: <SellCompletePage />,
          },
          { path: 'stores/:storeId', element: <StorePage /> },
          { path: 'store/manage', element: <StoreManagePage /> },
          {
            path: 'transactions/:transactionId',
            element: <TransactionPage />,
          },
          { path: '*', element: <NotFoundPage /> },
        ],
      },
    ],
  },
];

export const router = createBrowserRouter(routeObjects);
