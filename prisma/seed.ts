/**
 * Badge seed script — populates the badges table with all badge definitions.
 *
 * Run: pnpm db:seed
 * Uses upsert so it's safe to re-run (updates existing, creates missing).
 */
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
});
const adapter = new PrismaPg(pool, { schema: 'wordle' });
const prisma = new PrismaClient({ adapter });

const BADGES = [
    // ─── Milestones (one-off, no group) ───
    {
        slug: 'first-blood',
        name: 'First Blood',
        description: 'Win your first game',
        category: 'milestone',
        threshold: 1,
        icon: 'Sword',
        group: null,
    },
    {
        slug: 'perfect-game',
        name: 'Perfect Game',
        description: 'Win in 1 guess',
        category: 'milestone',
        threshold: 0,
        icon: 'Star',
        group: null,
    },
    {
        slug: 'persistence',
        name: 'Last Chance',
        description: 'Win using your very last guess',
        category: 'milestone',
        threshold: 0,
        icon: 'Target',
        group: null,
    },

    // ─── Polyglot series (group: polyglot) ───
    {
        slug: 'polyglot-2',
        name: 'Bilingual',
        description: 'Win in 2 different languages',
        category: 'polyglot',
        threshold: 2,
        icon: 'Globe',
        group: 'polyglot',
    },
    {
        slug: 'polyglot-5',
        name: 'Polyglot',
        description: 'Win in 5 different languages',
        category: 'polyglot',
        threshold: 5,
        icon: 'Globe',
        group: 'polyglot',
    },
    {
        slug: 'polyglot-10',
        name: 'Polyglot II',
        description: 'Win in 10 different languages',
        category: 'polyglot',
        threshold: 10,
        icon: 'Globe',
        group: 'polyglot',
    },
    {
        slug: 'polyglot-20',
        name: 'Polyglot III',
        description: 'Win in 20 different languages',
        category: 'polyglot',
        threshold: 20,
        icon: 'Globe',
        group: 'polyglot',
    },
    {
        slug: 'polyglot-40',
        name: 'Polyglot IV',
        description: 'Win in 40 different languages',
        category: 'polyglot',
        threshold: 40,
        icon: 'Globe',
        group: 'polyglot',
    },
    {
        slug: 'polyglot-80',
        name: 'World Linguist',
        description: 'Win in all 80 languages',
        category: 'polyglot',
        threshold: 80,
        icon: 'Crown',
        group: 'polyglot',
    },

    // ─── Streak series (group: streak) ───
    {
        slug: 'streak-3',
        name: 'Getting Started',
        description: '3-day daily streak',
        category: 'streak',
        threshold: 3,
        icon: 'Flame',
        group: 'streak',
    },
    {
        slug: 'streak-7',
        name: 'Week Warrior',
        description: '7-day daily streak',
        category: 'streak',
        threshold: 7,
        icon: 'Flame',
        group: 'streak',
    },
    {
        slug: 'streak-30',
        name: 'Monthly Master',
        description: '30-day daily streak',
        category: 'streak',
        threshold: 30,
        icon: 'Flame',
        group: 'streak',
    },
    {
        slug: 'streak-100',
        name: 'Century Club',
        description: '100-day daily streak',
        category: 'streak',
        threshold: 100,
        icon: 'Flame',
        group: 'streak',
    },
    {
        slug: 'streak-365',
        name: 'Year of Words',
        description: '365-day daily streak',
        category: 'streak',
        threshold: 365,
        icon: 'Trophy',
        group: 'streak',
    },

    // ─── Mode mastery (group: mode) ───
    {
        slug: 'mode-master-10',
        name: 'Dedicated',
        description: 'Win 10 games in any single mode',
        category: 'mode',
        threshold: 10,
        icon: 'Zap',
        group: 'mode',
    },
    {
        slug: 'mode-master',
        name: 'Mode Master',
        description: 'Win 50 games in any single mode',
        category: 'mode',
        threshold: 50,
        icon: 'Zap',
        group: 'mode',
    },

    // ─── Special (one-off, no group) ───
    {
        slug: 'daily-completionist',
        name: 'Daily Completionist',
        description: 'Complete all daily game modes in a single day',
        category: 'special',
        threshold: 0,
        icon: 'CalendarCheck',
        group: null,
    },
    {
        slug: 'language-conqueror',
        name: 'Language Conqueror',
        description: 'Play daily in 10+ languages in a single day',
        category: 'special',
        threshold: 10,
        icon: 'Map',
        group: null,
    },
    {
        slug: 'the-impossible',
        name: 'The Impossible',
        description: 'Complete every daily mode in every language in a single day',
        category: 'special',
        threshold: 0,
        icon: 'Crown',
        group: null,
    },
];

async function main() {
    console.log(`Seeding ${BADGES.length} badges...`);

    for (const badge of BADGES) {
        await prisma.badge.upsert({
            where: { slug: badge.slug },
            create: badge,
            update: {
                name: badge.name,
                description: badge.description,
                category: badge.category,
                threshold: badge.threshold,
                icon: badge.icon,
                group: badge.group,
            },
        });
    }

    console.log('Done.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
        await pool.end();
    });
