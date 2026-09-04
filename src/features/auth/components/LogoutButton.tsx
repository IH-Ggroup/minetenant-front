import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useDemoStore } from '@/app/demo-store-context';
import { paths } from '@/app/paths';
import { Button } from '@/shared/ui/Button';

export function LogoutButton() {
  const { logout } = useDemoStore();
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');

  const handleLogout = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    setError('');
    try {
      await logout();
      navigate(paths.login, { replace: true });
    } catch (error) {
      setError(
        error instanceof Error ? error.message : 'ログアウトできませんでした。',
      );
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div>
      <Button
        type="button"
        variant="secondary"
        isLoading={isProcessing}
        onClick={handleLogout}
      >
        ログアウト
      </Button>
      {error ? <p role="alert">{error}</p> : null}
    </div>
  );
}
