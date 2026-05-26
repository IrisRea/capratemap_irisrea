# capratemap_irisrea

このリポジトリは GitHub Pages で公開するサイト本体です。

## データ運用

- 正本データはローカルの `キャップレートマップ_α1.csv` です
- CSV は公開リポジトリに含めません
- 公開用の `index.html` と `guarded-data/` は CSV から生成します

`.gitignore` により、CSV は GitHub に再アップロードされないようにしています。

## 更新手順

1. ローカルの `キャップレートマップ_α1.csv` を修正する
2. 次のコマンドで公開用データを再生成する

```powershell
.\update-site.ps1
```

3. 生成結果をローカルで確認する
4. 問題なければ次を実行する

```powershell
git add index.html guarded-data tools README.md update-site.ps1
git commit -m "Update published property data"
git push origin main
```

## update-site.ps1 がやること

- `キャップレートマップ_α1.csv` の存在確認
- `tools/build_protected_page.mjs` の実行
- `git status --short` による差分確認

## 注意点

- `guarded-data/` と `index.html` は生成物です
- 公開サイトを更新したいときは、CSV を修正したあとに必ず再生成してください
- CSV 自体は履歴にも再投入しないよう、`git add .` ではなく必要なファイルを明示して追加するのが安全です
