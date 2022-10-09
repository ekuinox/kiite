import { Hono } from 'hono';
import type { Env } from './env';
import { createRoutes } from './routes';

// https://developer.spotify.com/documentation/general/guides/authorization/scopes/
const SPOTIFY_SCOPES = [
    'streaming',
    'user-read-email',
    'user-read-private',
    'playlist-modify-public',
    'playlist-modify-private',
    'user-read-currently-playing',
    'user-modify-playback-state',
];

const app = new Hono<{ Bindings: Env }>();

const routes = createRoutes(SPOTIFY_SCOPES);

app.route('/', routes);

export default app;
