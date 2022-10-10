export const createToken = () => {
    const buffer = new Uint8Array(64);
    const randomBytes = crypto.getRandomValues(buffer);
    const token = Array.from(randomBytes).map(b => b.toString(16).padStart(2, '0')).join('');
    return token;
};
