# kiite

## setup

### secrets

Register the following secrets

- `SPOTIFY_CLIENT_ID`
- `SPOTIFY_CLIENT_SECRET`
- `CALLBACK_URL`

for production environment

```console
$ wrangler secret put SPOTIFY_CLIENT_ID
```

for development environment


```console
$ wrangler secret put SPOTIFY_CLIENT_ID -e dev
```
