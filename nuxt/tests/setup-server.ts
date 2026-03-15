/**
 * Vitest globalSetup — starts a Nuxt dev server before integration tests.
 *
 * The server starts on a random available port. The URL is shared with test
 * files via process.env.TEST_BASE_URL (vitest provides env vars to tests).
 *
 * If TEST_BASE_URL is already set (e.g., pointing at production), the server
 * is NOT started — tests use the external URL directly.
 */
import { spawn, type ChildProcess } from 'child_process';
import { createServer } from 'net';

let serverProcess: ChildProcess | null = null;

/** Find a free port by briefly binding to port 0. */
async function getFreePort(): Promise<number> {
    return new Promise((resolve, reject) => {
        const srv = createServer();
        srv.listen(0, () => {
            const addr = srv.address();
            if (addr && typeof addr === 'object') {
                const port = addr.port;
                srv.close(() => resolve(port));
            } else {
                reject(new Error('Failed to get free port'));
            }
        });
        srv.on('error', reject);
    });
}

/** Wait until the URL responds with a 200-range status. */
async function waitForServer(url: string, timeoutMs = 60_000): Promise<void> {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
        try {
            const res = await fetch(url, { signal: AbortSignal.timeout(2000) });
            if (res.ok) return;
        } catch {
            // Server not ready yet
        }
        await new Promise((r) => setTimeout(r, 500));
    }
    throw new Error(`Server at ${url} did not become ready within ${timeoutMs}ms`);
}

export async function setup(): Promise<void> {
    // If the user already set TEST_BASE_URL, skip starting a server
    if (process.env.TEST_BASE_URL) {
        console.log(`[setup-server] Using existing server: ${process.env.TEST_BASE_URL}`);
        return;
    }

    const port = await getFreePort();
    const baseUrl = `http://localhost:${port}`;

    console.log(`[setup-server] Starting Nuxt dev server on port ${port}...`);

    serverProcess = spawn('npx', ['nuxt', 'dev', '--port', String(port)], {
        cwd: process.cwd(),
        stdio: ['ignore', 'pipe', 'pipe'],
        detached: true,
        env: { ...process.env, NODE_ENV: 'development', NUXT_PORT: String(port) },
    });

    // Log server output for debugging
    serverProcess.stdout?.on('data', (data) => {
        const msg = data.toString().trim();
        if (msg.includes('ready') || msg.includes('Listening') || msg.includes('error')) {
            console.log(`[nuxt-dev] ${msg}`);
        }
    });

    serverProcess.stderr?.on('data', (data) => {
        const msg = data.toString().trim();
        if (msg && !msg.includes('ExperimentalWarning')) {
            console.error(`[nuxt-dev] ${msg}`);
        }
    });

    serverProcess.on('error', (err) => {
        console.error(`[setup-server] Failed to start server:`, err);
    });

    // Make the URL available to all test files
    process.env.TEST_BASE_URL = baseUrl;

    // Wait for the server to be ready
    try {
        await waitForServer(`${baseUrl}/api/languages`, 60_000);
        console.log(`[setup-server] Nuxt server ready at ${baseUrl}`);
    } catch (err) {
        // Kill the process if it never became ready
        serverProcess.kill('SIGTERM');
        serverProcess = null;
        throw err;
    }
}

export async function teardown(): Promise<void> {
    if (serverProcess) {
        console.log('[setup-server] Stopping Nuxt dev server...');

        // Kill the entire process group to clean up child processes
        try {
            process.kill(-serverProcess.pid!, 'SIGKILL');
        } catch {
            serverProcess.kill('SIGKILL');
        }

        serverProcess = null;
    }
}
