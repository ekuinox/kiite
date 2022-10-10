# kiite

Spotifyの次に再生を誰かに入れてもらうやつ

## 環境

- npm
- wrangler

workspaceが2つあって、`/page`がフロント用、`/worker`がバックエンド用。結局はどっちもcloudflare workerで扱う。

- ワーカーの開発サーバが立つ ... `npm run start -w worker`
- ワーカーをデプロイする ... `npm run deploy -w worker`
- フロントをウォッチする ... `npm run watch -w page`
- フロントをビルドする ... `npm run build -w page`

面倒なことにローカルで開発するには、フロントをウォッチした上で開発サーバを立てないといけない。

ワーカーを使うには最初に以下のsecretをセットアップしないといけない

- `SPOTIFY_CLIENT_ID`
- `SPOTIFY_CLIENT_SECRET`
- `CALLBACK_URL`

```console
$ wrangler secret put SPOTIFY_CLIENT_ID
```

こんな感じでやる。これは本番用

```console
$ wrangler secret put SPOTIFY_CLIENT_ID -e dev
```

別途、開発環境用にセットして欲しい
