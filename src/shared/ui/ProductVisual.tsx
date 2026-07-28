import type { ProductTheme } from '@/domain/models';
import { classNames } from '@/shared/lib/class-names';

interface ProductVisualProps {
  theme: ProductTheme;
  emoji: string;
  name: string;
  compact?: boolean;
}

export function ProductVisual({ name, compact = false }: ProductVisualProps) {
  return (
    <div
      className={classNames(
        'product-visual',
        compact && 'product-visual--compact',
      )}
      role="img"
      aria-label={`${name}の商品画像予定領域`}
    >
      <span>商品画像</span>
    </div>
  );
}
