import { constants, copyFileSync } from 'node:fs';

// npm run setup はプロジェクト直下で実行されます。
// Windows / macOS / Linux 共通で使え、各自の接続設定は上書きしません。
try {
  copyFileSync('.env.example', '.env.local', constants.COPYFILE_EXCL);
  console.log(
    '.env.local を作成しました。Laravel API の接続先を確認してください。',
  );
} catch (error) {
  if (error.code === 'EEXIST') {
    console.log('.env.local は既にあります。現在の設定をそのまま使用します。');
  } else {
    console.error('.env.local を作成できませんでした。', error.message);
    process.exitCode = 1;
  }
}
