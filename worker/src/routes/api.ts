import { Hono } from 'hono';
import { Env } from '../env';
import { KV } from '../lib';
import { SpotifyClient } from '../spotify';


export const createApi = () => {
    const api = new Hono<{ Bindings: Env }>();

    api.get('/users/:id/playing', async (c) => {
        const { SPOTIFY_CLIENT_ID: clientId, SPOTIFY_CLIENT_SECRET: clientSecret, CALLBACK_URL: callbackUrl } = c.env;
        const id = c.req.param('id');
        const kv = new KV(c.env.KV);
        const refreshToken = await kv.getRefreshToken(id);
        if (refreshToken == null) {
            return c.json({ error: `not found user id => ${id}` });
        }
        const client = await SpotifyClient.fromRefreshToken(refreshToken, { clientId, clientSecret, redirectUri: callbackUrl });

        const { item: track, isPlaying } = await client.getCurrentlyPlayingTrack();
        const user = await client.getCurrentUsersProfile();
        return c.json({
            track,
            isPlaying,
            user,
        });
    });

    api.post('/users/:id/queue', async (c) => {
        const { SPOTIFY_CLIENT_ID: clientId, SPOTIFY_CLIENT_SECRET: clientSecret, CALLBACK_URL: callbackUrl } = c.env;
        const id = c.req.param('id');
        const kv = new KV(c.env.KV);
        const enabled = await kv.getEnabled(id);
        if (!enabled) {
            c.status(403);
            return c.json({ error: `${id} not enabled` });
        }

        const refreshToken = await kv.getRefreshToken(id);
        if (refreshToken == null) {
            c.status(403);
            return c.json({ error: `not found user id => ${id}` });
        }

        const { trackId } = c.req.query();
        const trackUri = `spotify:track:${trackId}`;

        const client = await SpotifyClient.fromRefreshToken(refreshToken, { clientId, clientSecret, redirectUri: callbackUrl });
        await client.addItemToPlaybackQueue(trackUri);

        return c.json({ trackUri });
    });
    return api;
};
