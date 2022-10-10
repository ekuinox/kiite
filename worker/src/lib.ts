export const createToken = () => {
    const buffer = new Uint8Array(64);
    const randomBytes = crypto.getRandomValues(buffer);
    const token = Array.from(randomBytes).map(b => b.toString(16).padStart(2, '0')).join('');
    return token;
};

export class KV {
    readonly #kv: KVNamespace;
    constructor(kv: KVNamespace) {
        this.#kv = kv;
    }

    static #accessTokenKey = (id: string) => `${id}/accessToken`;

    static #refreshTokenKey = (id: string) => `${id}/refreshToken`;

    static #idBySessionKey = (session: string) => `${session}/id`;

    static #enabledKey = (id: string) => `${id}/enabled`;

    getAccessToken = (id: string) => this.#kv.get(KV.#accessTokenKey(id));

    putAccessToken = (id: string, accessToken: string) => this.#kv.put(KV.#accessTokenKey(id), accessToken);

    getRefreshToken = (id: string) => this.#kv.get(KV.#refreshTokenKey(id));

    putRefreshToken = (id: string, accessToken: string) => this.#kv.put(KV.#refreshTokenKey(id), accessToken);

    getIdBySession = (session: string) => this.#kv.get(KV.#idBySessionKey(session));

    // セッションに対するIDを保持したいけど、2時間で途切れるようにのつもり
    // https://developers.cloudflare.com/workers/runtime-apis/kv#expiring-keys
    putIdBySession = (session: string, id: string) => this.#kv.put(
        KV.#idBySessionKey(session),
        id,
        { expirationTtl: Math.round(Date.now() / 1000) + 60 * 60 * 2 }
    );

    deleteIdBySession = (session: string) => this.#kv.delete(KV.#idBySessionKey(session));

    putEnabled = (id: string) => this.#kv.put(KV.#enabledKey(id), '1');

    getEnabled = async (id: string) => {
        try {
            const text = await this.#kv.get(KV.#enabledKey(id));
            return text === '1';
        } catch (e: unknown) {
            return false;
        }
    };

    putDisabled = (id: string) => this.#kv.delete(KV.#enabledKey(id));
}
