import { Hono } from 'hono';
import { Env } from '../env';
import { createToken } from '../lib';
import { SpotifyClient } from '../spotify';
import { api } from './api';

export const createRoutes = (spotifyScopes: ReadonlyArray<string>) => {
    const routes = new Hono<{ Bindings: Env }>();

    routes.route('/api', api);

    routes.get('/', async (c) => {
        const { session } = c.req.cookie();
        if (session == null) {
            const token = createToken();
            c.cookie('session', token, { sameSite: 'Strict' });
        }

        const id = await c.env.KV.get(`${session}/id`);
        const enabled = (await c.env.KV.get(`${id}/enable`)) === '1';

        if (id != null) {
            return c.html(`
                <html>
                    <head>
                    </head>
                    <body>
                        <div>
                            <p>hello <a href="/users/${id}">${id}</a></p>
                            <p>Enabled: ${enabled}</p>
                            <a href="/enable">enable</a>
                            <a href="/disable">disable</a>
                        </div>
                    </body>
                </html>
            `);
        }

        return c.html(`
            <a href="/login">login</a>
        `);
    });

    routes.get('/login', async (c) => {
        const { SPOTIFY_CLIENT_ID: clientId, CALLBACK_URL: redirectUri } = c.env;

        const { session } = c.req.cookie();
        if (session == null) {
            return c.redirect('/');
        }

        const authorizeUri = SpotifyClient.generateAuthorizeUri(
            session,
            spotifyScopes,
            { clientId, redirectUri }
        );
        c.cookie('state', session, { sameSite: 'Strict' });

        return c.redirect(authorizeUri);
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
            return c.redirect('/');
        } catch (e: unknown) {
            console.error(e);
            return c.text('error');
        }
    });

    routes.get('/enable', async (c) => {
        const { session } = c.req.cookie();
        const id = await c.env.KV.get(`${session}/id`);
        await c.env.KV.put(`${id}/enable`, '1');
        return c.html(`
            <p>OK<p>
            <a href="/">back</a>
        `);
    });

    routes.get('/disable', async (c) => {
        const { session } = c.req.cookie();
        const id = await c.env.KV.get(`${session}/id`);
        await c.env.KV.delete(`${id}/enable`);
        return c.html(`
            <p>OK<p>
            <a href="/">back</a>
        `);
    });

    routes.get('/users/:id', async (c) => {
        const id = c.req.param('id');
        const enabled = (await c.env.KV.get(`${id}/enable`)) === '1';
        if (!enabled) {
            return c.html(`
                <p>${id}には今聴かせられないみたい<p>
                <a href="/">back</a>
            `);
        }
        return c.html(`
            <div>
                <input placeholder="userId" type="text" id="target-user-id">
                <input placeholder="trackId" type="text" id="target-track-id">
                <button id="submit">聴かせる</button>
                <script>
                    const button = document.getElementById('submit');
                    button.addEventListener('click', () => {
                        const userId = document.getElementById('target-user-id').value;
                        const trackId = document.getElementById('target-track-id').value;
                        fetch('/api/users/${id}/queue?trackId=' + trackId, { method: 'POST' });
                    });
                </script>
                <a href="/">back</a>
            </div>
        `);
    });

    return routes;
};
