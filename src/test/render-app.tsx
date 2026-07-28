import { render } from '@testing-library/react';
import {
  createMemoryRouter,
  RouterProvider,
  type InitialEntry,
} from 'react-router-dom';

import { DemoStoreProvider } from '@/app/DemoStoreProvider';
import { routeObjects } from '@/app/router';

export function renderApp(initialEntry: InitialEntry) {
  const router = createMemoryRouter(routeObjects, {
    initialEntries: [initialEntry],
  });

  return {
    router,
    ...render(
      <DemoStoreProvider>
        <RouterProvider router={router} />
      </DemoStoreProvider>,
    ),
  };
}
