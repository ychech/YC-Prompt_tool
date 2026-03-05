// GitHub OAuth Authentication

const GITHUB_CLIENT_ID = 'YOUR_GITHUB_CLIENT_ID';
const GITHUB_CLIENT_SECRET = 'YOUR_GITHUB_CLIENT_SECRET';
const JWT_SECRET = 'YOUR_JWT_SECRET';

// Generate JWT token
async function signJWT(payload, secret) {
    const encoder = new TextEncoder();
    const data = encoder.encode(JSON.stringify(payload));
    const key = await crypto.subtle.importKey(
        'raw',
        encoder.encode(secret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
    );
    const signature = await crypto.subtle.sign('HMAC', key, data);
    const base64Data = btoa(String.fromCharCode(...new Uint8Array(data)));
    const base64Sig = btoa(String.fromCharCode(...new Uint8Array(signature)));
    return `${base64Data}.${base64Sig}`;
}

// Verify JWT token
async function verifyJWT(token, secret) {
    try {
        const [dataB64, sigB64] = token.split('.');
        const data = new TextEncoder().encode(atob(dataB64));
        const signature = Uint8Array.from(atob(sigB64), c => c.charCodeAt(0));
        
        const key = await crypto.subtle.importKey(
            'raw',
            new TextEncoder().encode(secret),
            { name: 'HMAC', hash: 'SHA-256' },
            false,
            ['verify']
        );
        
        const isValid = await crypto.subtle.verify('HMAC', key, signature, data);
        if (!isValid) return null;
        
        return JSON.parse(atob(dataB64));
    } catch (e) {
        return null;
    }
}

// GitHub OAuth login URL
export async function getGitHubAuthUrl() {
    const state = crypto.randomUUID();
    const params = new URLSearchParams({
        client_id: GITHUB_CLIENT_ID,
        redirect_uri: 'https://ychech.github.io/YC-Prompt_tool/v2-database/callback',
        scope: 'read:user user:email',
        state: state
    });
    
    return `https://github.com/login/oauth/authorize?${params}`;
}

// Handle GitHub OAuth callback
export async function handleGitHubCallback(code, state, db) {
    // Exchange code for access token
    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            client_id: GITHUB_CLIENT_ID,
            client_secret: GITHUB_CLIENT_SECRET,
            code: code
        })
    });
    
    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) {
        throw new Error('Failed to get access token');
    }
    
    // Get user info from GitHub
    const userRes = await fetch('https://api.github.com/user', {
        headers: {
            'Authorization': `Bearer ${tokenData.access_token}`,
            'User-Agent': 'YC-Prompt-Tool'
        }
    });
    
    const githubUser = await userRes.json();
    
    // Check if user exists
    let user = await db.prepare(
        'SELECT * FROM users WHERE github_id = ?'
    ).bind(githubUser.id).first();
    
    if (!user) {
        // Create new user
        const userId = crypto.randomUUID();
        await db.prepare(`
            INSERT INTO users (id, github_id, username, email, avatar)
            VALUES (?, ?, ?, ?, ?)
        `).bind(
            userId,
            githubUser.id,
            githubUser.login,
            githubUser.email,
            githubUser.avatar_url
        ).run();
        
        user = { id: userId, username: githubUser.login, avatar: githubUser.avatar_url };
    }
    
    // Generate JWT
    const token = await signJWT(
        { userId: user.id, username: user.username },
        JWT_SECRET
    );
    
    return { token, user };
}

// Middleware to verify auth
export async function verifyAuth(request) {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null;
    }
    
    const token = authHeader.slice(7);
    return await verifyJWT(token, JWT_SECRET);
}

export { signJWT, verifyJWT };
