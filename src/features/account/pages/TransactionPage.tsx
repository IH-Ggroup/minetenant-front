import { ArrowLeft, MessageCircle, Package, Send } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { useDemoStore } from '@/app/demo-store-context';
import { paths } from '@/app/paths';
import { DEMO_USERS } from '@/mocks/fixtures';
import {
  formatDateTime,
  formatPrice,
  transactionStatusLabel,
} from '@/shared/lib/format';
import { Badge } from '@/shared/ui/Badge';
import { Button } from '@/shared/ui/Button';
import { EmptyState } from '@/shared/ui/EmptyState';
import { PageHeader } from '@/shared/ui/PageHeader';

export function TransactionPage() {
  const { transactionId = '' } = useParams();
  const { state, activeUser, sendMessage } = useDemoStore();
  const [body, setBody] = useState('');
  const [error, setError] = useState('');
  const transaction = state.transactions.find(
    (item) => item.id === transactionId,
  );
  const product = state.products.find(
    (item) => item.id === transaction?.productId,
  );

  if (!transaction || !product) {
    return (
      <EmptyState
        icon={<Package size={32} />}
        title="取引が見つかりません"
        description="マイページから取引を選び直してください。"
        action={
          <Link className="button button--primary" to={paths.myPage}>
            マイページへ
          </Link>
        }
      />
    );
  }

  const messages = state.messages.filter(
    (message) => message.transactionId === transaction.id,
  );
  const partnerId =
    transaction.buyerId === activeUser.id
      ? transaction.sellerId
      : transaction.buyerId;
  const partner = DEMO_USERS.find((user) => user.id === partnerId);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const result = sendMessage(transaction.id, body);

    if (result.ok) {
      setBody('');
      setError('');
      return;
    }

    setError(result.error ?? 'メッセージを送信できませんでした。');
  };

  return (
    <div className="narrow-page page-stack">
      <nav className="breadcrumbs" aria-label="パンくず">
        <Link to={paths.myPage}>
          <ArrowLeft size={16} aria-hidden="true" />
          マイページ
        </Link>
      </nav>

      <PageHeader
        title="取引メッセージ"
        description={`${partner?.name ?? '取引相手'}さんとのやり取り`}
        actions={
          <Badge tone="neutral">
            {transactionStatusLabel(transaction.status)}
          </Badge>
        }
      />

      <section className="panel">
        <div className="panel__heading">
          <div>
            <h2>{product.name}</h2>
            <p>{formatPrice(transaction.amount)}</p>
          </div>
          <Link className="text-button" to={paths.product(product.id)}>
            商品詳細
          </Link>
        </div>
      </section>

      <section className="message-panel">
        <div className="message-panel__heading">
          <MessageCircle size={20} aria-hidden="true" />
          <h2>メッセージ</h2>
          <span>{messages.length}件</span>
        </div>

        <div className="message-list" aria-live="polite">
          {messages.length === 0 && (
            <div className="compact-empty">
              <p>まだメッセージはありません。</p>
            </div>
          )}

          {messages.map((message) => {
            const isMine = message.senderId === activeUser.id;
            const sender = DEMO_USERS.find(
              (user) => user.id === message.senderId,
            );

            return (
              <article
                className={isMine ? 'message message--mine' : 'message'}
                key={message.id}
              >
                <span className="message__avatar" aria-hidden="true">
                  {sender?.avatarInitial ?? '?'}
                </span>
                <div>
                  <p>{message.body}</p>
                  <small>{formatDateTime(message.createdAt)}</small>
                </div>
              </article>
            );
          })}
        </div>

        <form className="message-form" onSubmit={handleSubmit}>
          <label htmlFor="message-body">メッセージを入力</label>
          <div>
            <textarea
              id="message-body"
              className="textarea"
              rows={3}
              value={body}
              onChange={(event) => {
                setBody(event.target.value);
                setError('');
              }}
              placeholder="メッセージを入力してください"
              aria-invalid={Boolean(error)}
              aria-describedby={error ? 'message-error' : undefined}
            />
            <Button type="submit" leadingIcon={<Send size={17} />}>
              送信
            </Button>
          </div>
          {error && (
            <span className="field__error" id="message-error">
              {error}
            </span>
          )}
        </form>
      </section>
    </div>
  );
}
