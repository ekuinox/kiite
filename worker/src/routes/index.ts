import { Hono } from 'hono';
import { serveStatic } from 'hono/serve-static.module';
import { Env } from '../env';
import { createToken, KV } from '../lib';
import { SpotifyClient } from '../spotify';
import { createApi } from './api';

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

    routes.route('/api', createApi());

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
        const kv = new KV(c.env.KV);
        await kv.deleteIdBySession(session);
        return c.redirect('/');
    });

    routes.get('/id', async (c) => {
        const { session } = c.req.cookie();
        const kv = new KV(c.env.KV);
        const id = await kv.getIdBySession(session);
        if (id == null) {
            c.status(403);
            return c.text('Err');
        }
        const enabled = await kv.getEnabled(id);
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

        const kv = new KV(c.env.KV);

        try {
            const client = await SpotifyClient.fromCode(code, { clientId, clientSecret, redirectUri: callbackUrl });
            const { id } = await client.getCurrentUsersProfile();
            kv.putAccessToken(id, client.getAccessToken());
            kv.putRefreshToken(id, client.getRefreshToken());
            kv.putIdBySession(session, id);
            return c.redirect('/');
        } catch (e: unknown) {
            console.error(e);
            return c.text('error');
        }
    });

    routes.post('/enable', async (c) => {
        const { session } = c.req.cookie();
        const kv = new KV(c.env.KV);
        const id = await kv.getIdBySession(session);
        if (id == null) {
            c.status(403);
            return c.text('Err');
        }
        await kv.putEnabled(id);
        c.status(200);
        return c.text('OK');
    });

    routes.post('/disable', async (c) => {
        const { session } = c.req.cookie();
        const kv = new KV(c.env.KV);
        const id = await kv.getIdBySession(session);
        if (id == null) {
            c.status(403);
            return c.text('Err');
        }
        await kv.putDisabled(id);
        c.status(200);
        return c.text('OK');
    });

    return routes;
};
