import { Component, type ErrorInfo, type PropsWithChildren } from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
}

export class AppErrorBoundary extends Component<
  PropsWithChildren,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('MineTenant rendering error', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="fatal-error">
          <div className="fatal-error__panel">
            <p className="eyebrow">APPLICATION ERROR</p>
            <h1>画面を表示できませんでした</h1>
            <p>
              ページを再読み込みしてください。直らない場合はデモデータを初期化してください。
            </p>
            <button
              className="button button--primary"
              type="button"
              onClick={() => window.location.assign('/login')}
            >
              ログイン画面へ戻る
            </button>
          </div>
        </main>
      );
    }

    return this.props.children;
  }
}
