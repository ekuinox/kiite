import * as z from 'zod';

const tokenResponseType = z.object({
    access_token: z.string(),
    refresh_token: z.string(),
}).transform(({ access_token, refresh_token }) => ({
    accessToken: access_token,
    refreshToken: refresh_token,
}));

const refreshTokenResponseType = z.object({
    access_token: z.string(),
}).transform(({ access_token }) => ({
    accessToken: access_token,
}));

const getCurrentUsersProfileResponseType = z.object({
    country: z.string(),
    display_name: z.string(),
    id: z.string(),
}).transform(({ display_name, ...rest }) => ({
    displayName: display_name,
    ...rest,
}));

const trackType = z.object({
    id: z.string(),
    name: z.string(),
});

const getCurrentlyPlayingTrackResponseType = z.object({
    item: trackType,
    is_playing: z.boolean(),
}).transform(({ is_playing, ...rest }) => ({
    isPlaying: is_playing,
    ...rest,
}));

interface SpotifyOAuth2AppCredentials {
    clientId: string;
    clientSecret: string;
    redirectUri: string;
}

export class SpotifyClient {
    #accessToken: string;
    #refreshToken: string;
    constructor(accessToken: string, refreshToken: string) {
        this.#accessToken = accessToken;
        this.#refreshToken = refreshToken;
    }

    getAccessToken = (): string => this.#accessToken;

    getRefreshToken = (): string => this.#refreshToken;

    static generateAuthorizeUri = (
        state: string,
        scopes: ReadonlyArray<string>,
        { clientId, redirectUri }: Omit<SpotifyOAuth2AppCredentials, 'clientSecret'>
    ): string => {
        const params = new URLSearchParams();
        params.append('client_id', clientId);
        params.append('response_type', 'code');
        params.append('redirect_uri', redirectUri);
        params.append('scope', scopes.join(' '));
        params.append('state', state);
        const authorizeUri = `https://accounts.spotify.com/authorize?${params.toString()}`;

        return authorizeUri;
    }

    static fromCode = async (
        code: string,
        { clientId, clientSecret, redirectUri }: SpotifyOAuth2AppCredentials
    ): Promise<SpotifyClient> => {
        const params = new URLSearchParams();
        params.append('grant_type', 'authorization_code');
        params.append('code', code);
        params.append('redirect_uri', redirectUri);

        const response = await fetch(`https://accounts.spotify.com/api/token?${params.toString()}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': `Basic ${btoa(`${clientId}:${clientSecret}`)}`
            },
        });
        const json = await response.json();
        const { accessToken, refreshToken } = await tokenResponseType.parseAsync(json);
        return new SpotifyClient(accessToken, refreshToken);
    };

    static #asJson = <T extends z.ZodTypeAny>(typeObject: T) => async (r: Response): Promise<z.infer<T>> => {
        const response = await r.json();
        return typeObject.parseAsync(response);
    };

    static fromRefreshToken = async (
        refreshToken: string,
        { clientId, clientSecret, redirectUri }: SpotifyOAuth2AppCredentials
    ): Promise<SpotifyClient> => {
        const params = new URLSearchParams();
        params.append('grant_type', 'refresh_token');
        params.append('refresh_token', refreshToken);
        const { accessToken } = await fetch(`https://accounts.spotify.com/api/token?${params.toString()}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': `Basic ${btoa(`${clientId}:${clientSecret}`)}`
            },
        }).then(SpotifyClient.#asJson(refreshTokenResponseType));
        return new SpotifyClient(accessToken, refreshToken);
    };

    #headers = (): { Authorization: string } => ({
        'Authorization': `Bearer ${this.#accessToken}`,
    });

    #request = async (method: string, path: string, params: Record<string, string> = {}) => {
        const query = new URLSearchParams();
        for (const [key, value] of Object.entries(params)) {
            query.set(key, value);
        }
        return fetch(`https://api.spotify.com/v1${path}?${query.toString()}`, {
            headers: this.#headers(),
            method,
        });
    };

    #get = async (path: string, params: Record<string, string> = {}) => {
        return this.#request('GET', path, params);
    };

    #post = async (path: string, params: Record<string, string> = {}) => {
        return this.#request('POST', path, params);
    };

    getCurrentUsersProfile = async (): Promise<z.infer<typeof getCurrentUsersProfileResponseType>> => {
        return this.#get('/me')
            .then(SpotifyClient.#asJson(getCurrentUsersProfileResponseType));
    };

    getCurrentlyPlayingTrack = async (): Promise<z.infer<typeof getCurrentlyPlayingTrackResponseType>> => {
        return this.#get('/me/player/currently-playing')
            .then(SpotifyClient.#asJson(getCurrentlyPlayingTrackResponseType));
    };

    /**
     * Add an item to the end of user's current playback queue.
     * @param uri The uri of the item to add to the queue. Must be a track or an episode uri. example value `spotify:track:4iV5W9uYEdYUVa79Axb7Rh`
     * @returns
     * @note Learn more at https://developer.spotify.com/documentation/web-api/reference/#/operations/add-to-queue
     */
    addItemToPlaybackQueue = async (uri: string): Promise<void> => {
        return this.#post('/me/player/queue', { uri }).then((r) => {
            if (!r.ok) {
                return Promise.reject();
            }
        });
    };
}
