import { Hono } from 'hono';
import { SpotifyClient } from './spotify';

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

const SPOTIFY_SCOPES = [
    'streaming',
    'user-read-email',
    'user-read-private',
    'playlist-modify-public',
    'playlist-modify-private'
];

const app = new Hono<{ Bindings: Env }>();

app.get('/', (c) => {
    return c.html(`
        <a href='/login'>login</a>
    `);
});

app.get('/login', async (c) => {
    const { SPOTIFY_CLIENT_ID: clientId, CALLBACK_URL: redirectUri } = c.env;

    const [authorizeUri, state] = SpotifyClient.generateAuthorizeUris(
        SPOTIFY_SCOPES,
        { clientId, redirectUri }
    );
    c.cookie('state', state);

    return c.redirect(authorizeUri);
});
app.get('/callback', async (c) => {
    const { SPOTIFY_CLIENT_ID: clientId, SPOTIFY_CLIENT_SECRET: clientSecret, CALLBACK_URL: callbackUrl } = c.env;
    const { state: cookieState } = c.req.cookie();
    const { code, state } = c.req.query();

    if (state !== cookieState) {
        return c.redirect('/');
    }

    try {
        const client = await SpotifyClient.fromCode(code, { clientId, clientSecret, redirectUri: callbackUrl });
        const profile = await client.getCurrentUsersProfile();
        return c.text(`hello ${profile.displayName}`);
    } catch (e: unknown) {
        console.error(e);
        return c.text('error');
    }
});

export default app;
