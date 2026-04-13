/**
 * Username and display name generation.
 *
 * Username: lowercase, alphanumeric + underscores, unique.
 * Display name: cute "Adjective Noun" format for passkey users.
 */
import { prisma } from '~/server/utils/prisma';

// ─── Username generation ───

const USERNAME_RE = /^[a-z0-9_]{2,30}$/;

/**
 * Sanitize a string into a valid username.
 * Strips non-alphanumeric chars, lowercases, replaces spaces with underscores.
 */
export function sanitizeUsername(raw: string): string {
    return raw
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '_')
        .replace(/[^a-z0-9_]/g, '')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '')
        .slice(0, 30);
}

export function isValidUsername(username: string): boolean {
    return USERNAME_RE.test(username);
}

/**
 * Generate a unique username from a base string.
 * If taken, appends _1, _2, etc.
 */
export async function generateUniqueUsername(base: string): Promise<string> {
    const sanitized = sanitizeUsername(base);
    if (!sanitized || sanitized.length < 2) {
        return generateUniqueUsername('player');
    }

    // Batch-check all taken usernames with this prefix in one query
    const taken = await prisma.user.findMany({
        where: { username: { startsWith: sanitized } },
        select: { username: true },
    });
    const takenSet = new Set(taken.map((u: { username: string }) => u.username));

    if (!takenSet.has(sanitized)) return sanitized;

    for (let i = 1; i < 1000; i++) {
        const candidate = `${sanitized}_${i}`.slice(0, 30);
        if (!takenSet.has(candidate)) return candidate;
    }

    return `${sanitized.slice(0, 20)}_${Date.now() % 100000}`;
}

/**
 * Generate a username from an email address.
 * "hugofmsaiz@gmail.com" → "hugofmsaiz"
 */
export async function usernameFromEmail(email: string): Promise<string> {
    const prefix = email.split('@')[0] || 'player';
    return generateUniqueUsername(prefix);
}

/**
 * Generate a username from a display name.
 * "Hugo Montenegro" → "hugo_montenegro"
 */
export async function usernameFromDisplayName(name: string): Promise<string> {
    return generateUniqueUsername(name);
}

// ─── Display name generation (cute words for passkey users) ───

const ADJECTIVES = [
    'Misty',
    'Sunny',
    'Snowy',
    'Frosty',
    'Stormy',
    'Breezy',
    'Dusty',
    'Dewy',
    'Foggy',
    'Rainy',
    'Windy',
    'Cloudy',
    'Starry',
    'Lunar',
    'Solar',
    'Arctic',
    'Golden',
    'Silver',
    'Amber',
    'Coral',
    'Jade',
    'Ruby',
    'Azure',
    'Ivory',
    'Copper',
    'Onyx',
    'Scarlet',
    'Indigo',
    'Crimson',
    'Emerald',
    'Cobalt',
    'Swift',
    'Brave',
    'Clever',
    'Bold',
    'Keen',
    'Noble',
    'Wise',
    'Witty',
    'Calm',
    'Gentle',
    'Mighty',
    'Silent',
    'Wild',
    'Fierce',
    'Proud',
    'Sly',
    'Nimble',
    'Plucky',
    'Dapper',
    'Merry',
    'Peppy',
    'Lively',
    'Serene',
    'Velvet',
    'Crystal',
    'Marble',
    'Rustic',
    'Cosmic',
    'Stellar',
    'Radiant',
    'Vivid',
    'Bright',
    'Warm',
    'Cool',
    'Cozy',
    'Sleek',
    'Crisp',
    'Polished',
    'Lucky',
    'Happy',
    'Quirky',
    'Zesty',
    'Spicy',
    'Fizzy',
    'Jolly',
    'Perky',
    'Snappy',
    'Zippy',
    'Bouncy',
    'Wily',
    'Rosy',
    'Hazy',
    'Rapid',
    'Steady',
];

const NOUNS = [
    'Fox',
    'Owl',
    'Panda',
    'Wolf',
    'Hawk',
    'Lynx',
    'Otter',
    'Raven',
    'Heron',
    'Finch',
    'Crane',
    'Wren',
    'Lark',
    'Robin',
    'Dove',
    'Falcon',
    'Badger',
    'Penguin',
    'Jaguar',
    'Parrot',
    'Salmon',
    'Viper',
    'Gecko',
    'Bison',
    'Koala',
    'Tiger',
    'Eagle',
    'Whale',
    'Seal',
    'Stork',
    'Maple',
    'Cedar',
    'Birch',
    'Sage',
    'Fern',
    'Iris',
    'Lotus',
    'Willow',
    'Thistle',
    'Clover',
    'Moss',
    'Bloom',
    'Orchid',
    'Ivy',
    'Holly',
    'Olive',
    'Aspen',
    'Hazel',
    'Poppy',
    'Violet',
    'Ember',
    'Spark',
    'Pearl',
    'Flint',
    'Storm',
    'Breeze',
    'River',
    'Brook',
    'Cliff',
    'Ridge',
    'Stone',
    'Frost',
    'Dune',
    'Wave',
    'Tide',
    'Reef',
    'Canyon',
    'Glacier',
    'Summit',
    'Meadow',
    'Star',
    'Moon',
    'Cloud',
    'Comet',
    'Nebula',
    'Aurora',
    'Eclipse',
    'Nova',
    'Quill',
    'Arrow',
    'Anchor',
    'Compass',
    'Lantern',
    'Prism',
    'Pixel',
    'Rune',
    'Token',
    'Shard',
];

function pickRandom<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)]!;
}

/**
 * Generate a cute display name + unique username pair for passkey users.
 * Returns { displayName: "Swift Fox", username: "swift_fox" }
 */
export async function generatePasskeyIdentity(): Promise<{
    displayName: string;
    username: string;
}> {
    const adj = pickRandom(ADJECTIVES);
    const noun = pickRandom(NOUNS);
    const displayName = `${adj} ${noun}`;
    const username = await generateUniqueUsername(`${adj}_${noun}`);
    return { displayName, username };
}
