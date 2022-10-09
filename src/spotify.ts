import * as z from 'zod';

const tokenResponseType = z.object({
    access_token: z.string(),
    refresh_token: z.string(),
}).transform(({ access_token, refresh_token }) => ({
    accessToken: access_token,
    refreshToken: refresh_token,
}));

const getCurrentUsersProfileResponseType = z.object({
    country: z.string(),
    display_name: z.string(),
}).transform(({ display_name, ...rest }) => ({
    displayName: display_name,
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

    static generateAuthorizeUris = (
        scopes: ReadonlyArray<string>,
        { clientId, redirectUri }: Omit<SpotifyOAuth2AppCredentials, 'clientSecret'>
    ): [authorizeUri: string, state: string] => {
        const buffer = new Uint8Array(64);
        const randomBytes = crypto.getRandomValues(buffer);
        const state = Array.from(randomBytes).map(b => b.toString(16).padStart(2, '0')).join('')

        const params = new URLSearchParams();
        params.append('client_id', clientId);
        params.append('response_type', 'code');
        params.append('redirect_uri', redirectUri);
        params.append('scope', scopes.join(' '));
        params.append('state', state);
        const authorizeUri = `https://accounts.spotify.com/authorize?${params.toString()}`;

        return [authorizeUri, state];
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

    #headers = (): { Authorization: string } => ({
        'Authorization': `Bearer ${this.#accessToken}`,
    });

    #get = async (path: string, params: Record<string, string> = {}) => {
        const query = new URLSearchParams();
        for (const [key, value] of Object.entries(params)) {
            query.set(key, value);
        }
        return fetch(`https://api.spotify.com/v1/${path}?${query.toString()}`, {
            headers: this.#headers(),
            method: 'GET',
        }).then((r) => r.json());
    };

    getCurrentUsersProfile = async (): Promise<z.infer<typeof getCurrentUsersProfileResponseType>> => {
        const response = await this.#get('me');
        return getCurrentUsersProfileResponseType.parseAsync(response);
    };
}
