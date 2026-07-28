import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';

import { DemoStoreProvider } from '@/app/DemoStoreProvider';
import { router } from '@/app/router';
import { AppErrorBoundary } from '@/shared/ui/AppErrorBoundary';
import '@/shared/styles/tokens.css';
import '@/shared/styles/global.css';
import '@/shared/styles/layout.css';
import '@/shared/styles/components.css';
import '@/shared/styles/pages.css';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element was not found');
}

createRoot(rootElement).render(
  <StrictMode>
    <AppErrorBoundary>
      <DemoStoreProvider>
        <RouterProvider router={router} />
      </DemoStoreProvider>
    </AppErrorBoundary>
  </StrictMode>,
);
