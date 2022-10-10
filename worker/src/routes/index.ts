import { Hono } from 'hono';
import { serveStatic } from 'hono/serve-static.module';
import { Env } from '../env';
import { createToken } from '../lib';
import { SpotifyClient } from '../spotify';
import { api } from './api';

export const createRoutes = (spotifyScopes: ReadonlyArray<string>) => {
    const routes = new Hono<{ Bindings: Env }>();

    routes.use('/*', serveStatic({ root: './' }));
    routes.use('/*', async (c, next) => {
        const { session } = c.req.cookie();
        if (session == null) {
            const token = createToken();
            c.cookie('session', token);
        }
        await next();
    });

    routes.route('/api', api);

    routes.get('/login', async (c) => {
        const { SPOTIFY_CLIENT_ID: clientId, CALLBACK_URL: redirectUri } = c.env;

        const { session } = c.req.cookie();
        if (session == null) {
            const token = createToken();
            c.cookie('session', token);
        }

        const authorizeUri = SpotifyClient.generateAuthorizeUri(
            session,
            spotifyScopes,
            { clientId, redirectUri }
        );
        return c.redirect(authorizeUri);
    });

    routes.get('/logout', async (c) => {
        const { session } = c.req.cookie();
        await c.env.KV.delete(`${session}/id`);
        return c.redirect('/');
    });

    routes.get('/id', async (c) => {
        const { session } = c.req.cookie();
        const id = await c.env.KV.get(`${session}/id`);
        const enabled = (await c.env.KV.get(`${id}/enable`)) === '1';
        return c.json({ id, enabled });
    });


    routes.get('/callback', async (c) => {
        const { SPOTIFY_CLIENT_ID: clientId, SPOTIFY_CLIENT_SECRET: clientSecret, CALLBACK_URL: callbackUrl } = c.env;

        const { session } = c.req.cookie();
        if (session == null) {
            return c.redirect('/');
        }

        const { code, state } = c.req.query();

        if (state !== session) {
            c.cookie('session', createToken());
            return c.text('invalid session');
        }

        try {
            const client = await SpotifyClient.fromCode(code, { clientId, clientSecret, redirectUri: callbackUrl });
            const { id } = await client.getCurrentUsersProfile();
            await c.env.KV.put(`${id}/accessToken`, client.getAccessToken());
            await c.env.KV.put(`${id}/refreshToken`, client.getRefreshToken());
            // セッションに対するIDを保持したいけど、2時間で途切れるようにのつもり
            // https://developers.cloudflare.com/workers/runtime-apis/kv#expiring-keys
            await c.env.KV.put(`${session}/id`, id, { expirationTtl: Math.round(Date.now() / 1000) + 60 * 60 * 2 });
            console.log('login ok');
            console.log({ session });
            c.cookie('session', session);
            return c.redirect('/');
        } catch (e: unknown) {
            console.error(e);
            return c.text('error');
        }
    });

    routes.post('/enable', async (c) => {
        const { session } = c.req.cookie();
        const id = await c.env.KV.get(`${session}/id`);
        await c.env.KV.put(`${id}/enable`, '1');
        c.status(200);
        return c.text('OK');
    });

    routes.post('/disable', async (c) => {
        const { session } = c.req.cookie();
        const id = await c.env.KV.get(`${session}/id`);
        await c.env.KV.delete(`${id}/enable`);
        c.status(200);
        return c.text('OK');
    });

    return routes;
};
