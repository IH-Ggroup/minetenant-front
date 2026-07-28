import { MapPinned } from 'lucide-react';

import { paths } from '@/app/paths';
import { ButtonLink } from '@/shared/ui/Button';
import { EmptyState } from '@/shared/ui/EmptyState';

export function NotFoundPage() {
  return (
    <div className="standalone-state">
      <EmptyState
        icon={<MapPinned size={34} />}
        title="ページが見つかりません"
        description="URLが変更されたか、まだ実装されていない画面です。商品一覧から操作を続けられます。"
        action={<ButtonLink to={paths.products}>商品一覧へ戻る</ButtonLink>}
      />
    </div>
  );
}
