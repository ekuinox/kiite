import { Hono } from 'hono';
import { encode } from 'base-64';

/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `wrangler dev src/index.ts` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `wrangler publish src/index.ts --name my-worker` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

export interface Env {
    // Example binding to KV. Learn more at https://developers.cloudflare.com/workers/runtime-apis/kv/
    // MY_KV_NAMESPACE: KVNamespace;
    //
    // Example binding to Durable Object. Learn more at https://developers.cloudflare.com/workers/runtime-apis/durable-objects/
    // MY_DURABLE_OBJECT: DurableObjectNamespace;
    //
    // Example binding to R2. Learn more at https://developers.cloudflare.com/workers/runtime-apis/r2/
    // MY_BUCKET: R2Bucket;
    SPOTIFY_CLIENT_ID: string;
    SPOTIFY_CLIENT_SECRET: string;
    CALLBACK_URL: string;
}

const app = new Hono<{ Bindings: Env }>();

app.get('/', (c) => {
    return c.text('hello world');
});

app.get('/login', (c) => {
    const { SPOTIFY_CLIENT_ID: clientId, CALLBACK_URL: callbackUrl } = c.env;

    const scopes = ['streaming', 'user-read-email', 'user-read-private', 'playlist-modify-public', 'playlist-modify-private'];
    const params = new URLSearchParams();
    const state = 'state';
    params.append('client_id', clientId);
    params.append('response_type', 'code');
    params.append('redirect_uri', callbackUrl);
    params.append('scope', scopes.join(' '));
    params.append('state', state);
    c.cookie('state', state);
    const redirectTo = `https://accounts.spotify.com/authorize?${params.toString()}`;
    return c.redirect(redirectTo);
});
app.get('/callback', async (c) => {
    const { SPOTIFY_CLIENT_ID: clientId, SPOTIFY_CLIENT_SECRET: clientSecret, CALLBACK_URL: callbackUrl } = c.env;
    const { state: cookieState } = c.req.cookie();
    console.log({ cookieState });
    const { code, state } = c.req.query();
    const params = new URLSearchParams();

    params.append('grant_type', 'authorization_code');
    params.append('code', code);
    params.append('redirect_uri', callbackUrl);

    const response = await fetch(`https://accounts.spotify.com/api/token?${params.toString()}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Basic ${encode(`${clientId}:${clientSecret}`)}`
        },
    });
    const json = await response.json();
    console.log((json as any).access_token);
    console.log(json);


    return c.redirect('/');
});

export default app;
