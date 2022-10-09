import { Hono } from 'hono';
import { Env } from '../env';
import { SpotifyClient } from '../spotify';

export const api = new Hono<{ Bindings: Env }>();

api.get('/users/:id/playing', async (c) => {
    const { SPOTIFY_CLIENT_ID: clientId, SPOTIFY_CLIENT_SECRET: clientSecret, CALLBACK_URL: callbackUrl } = c.env;
    const id = c.req.param('id');
    const accessToken = await c.env.KV.get(`${id}/accessToken`);
    const refreshToken = await c.env.KV.get(`${id}/refreshToken`);
    if (accessToken == null || refreshToken == null) {
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

    const enabledText = await c.env.KV.get(`${id}/enable`);

    const enabled = enabledText === '1';
    if (!enabled) {
        return c.json({ error: `${id} not enabled` });
    }

    const { trackId } = c.req.query();
    const refreshToken = await c.env.KV.get(`${id}/refreshToken`);
    if (refreshToken == null) {
        return c.json({ error: `not found user id => ${id}` });
    }

    const trackUri = `spotify:track:${trackId}`;

    const client = await SpotifyClient.fromRefreshToken(refreshToken, { clientId, clientSecret, redirectUri: callbackUrl });
    await client.addItemToPlaybackQueue(trackUri);
    return c.json({ trackUri });
});
