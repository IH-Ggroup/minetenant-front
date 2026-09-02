import { ArrowRight, Info, Package } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

import { getProduct } from '@/api/products';
import { paths } from '@/app/paths';
import type { Product } from '@/domain/models';
import { ButtonLink } from '@/shared/ui/Button';
import { EmptyState } from '@/shared/ui/EmptyState';
import { StepIndicator } from '@/shared/ui/StepIndicator';
import { SyncFlow } from '@/shared/ui/SyncFlow';

export function SellSyncPage() {
  const { productId = '' } = useParams();
  const [product, setProduct] = useState<Product | null>(null);

  useEffect(() => {
    if (!productId) {
      return;
    }
    getProduct(productId)
      .then(setProduct)
      .catch(() => {
        setProduct(null);
      });
  }, [productId]);

  if (!product) {
    return (
      <EmptyState
        icon={<Package size={32} />}
        title="同期する商品が見つかりません"
        description="商品を出品してから同期画面へ進んでください。"
        action={<ButtonLink to={paths.sell}>商品を出品する</ButtonLink>}
      />
    );
  }

  return (
    <div className="narrow-page page-stack">
      <StepIndicator
        steps={['商品情報', '内容確認', 'Minecraft同期', '完了']}
        currentStep={3}
        label="商品出品"
      />

      <section className="panel sync-stage">
        <div className="sync-stage__heading">
          <h1>Minecraft同期のイメージ</h1>
          <p>
            「{product.name}」をWebから共通データへ登録し、
            Minecraft店舗へ反映する想定です。
          </p>
        </div>

        <SyncFlow activeStep={3} />

        <div className="demo-notice" role="note">
          <Info size={18} aria-hidden="true" />
          <p>
            <strong>現在は画面上のイメージのみです</strong>
            実際のMinecraft通信は今後の開発で追加します。
          </p>
        </div>

        <div className="sync-stage__actions">
          <ButtonLink to={paths.sellComplete(product.id)}>
            完了画面へ
            <ArrowRight size={18} aria-hidden="true" />
          </ButtonLink>
        </div>
      </section>
    </div>
  );
}
