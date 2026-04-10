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
    // Milestones
    {
        slug: 'first-blood',
        name: 'First Blood',
        description: 'Win your first game',
        category: 'milestone',
        threshold: 1,
        icon: 'Sword',
    },
    {
        slug: 'perfect-game',
        name: 'Perfect Game',
        description: 'Win in 1 guess',
        category: 'milestone',
        threshold: 0,
        icon: 'Star',
    },
    {
        slug: 'persistence',
        name: 'Last Chance',
        description: 'Win using your very last guess',
        category: 'milestone',
        threshold: 0,
        icon: 'Target',
    },

    // Polyglot
    {
        slug: 'polyglot-5',
        name: 'Polyglot I',
        description: 'Win in 5 different languages',
        category: 'polyglot',
        threshold: 5,
        icon: 'Globe',
    },
    {
        slug: 'polyglot-10',
        name: 'Polyglot II',
        description: 'Win in 10 different languages',
        category: 'polyglot',
        threshold: 10,
        icon: 'Globe',
    },
    {
        slug: 'polyglot-20',
        name: 'Polyglot III',
        description: 'Win in 20 different languages',
        category: 'polyglot',
        threshold: 20,
        icon: 'Globe',
    },
    {
        slug: 'polyglot-40',
        name: 'Polyglot IV',
        description: 'Win in 40 different languages',
        category: 'polyglot',
        threshold: 40,
        icon: 'Globe',
    },
    {
        slug: 'polyglot-80',
        name: 'Polyglot V',
        description: 'Win in all 80 languages',
        category: 'polyglot',
        threshold: 80,
        icon: 'Crown',
    },

    // Streaks
    {
        slug: 'streak-7',
        name: 'Week Warrior',
        description: '7-day daily streak',
        category: 'streak',
        threshold: 7,
        icon: 'Flame',
    },
    {
        slug: 'streak-30',
        name: 'Monthly Master',
        description: '30-day daily streak',
        category: 'streak',
        threshold: 30,
        icon: 'Flame',
    },
    {
        slug: 'streak-100',
        name: 'Century Club',
        description: '100-day daily streak',
        category: 'streak',
        threshold: 100,
        icon: 'Flame',
    },
    {
        slug: 'streak-365',
        name: 'Year of Words',
        description: '365-day daily streak',
        category: 'streak',
        threshold: 365,
        icon: 'Trophy',
    },

    // Mode mastery
    {
        slug: 'mode-master',
        name: 'Mode Master',
        description: 'Win 50 games in any single mode',
        category: 'mode',
        threshold: 50,
        icon: 'Zap',
    },

    // Special
    {
        slug: 'daily-completionist',
        name: 'Daily Completionist',
        description: 'Complete all daily game modes in a single day',
        category: 'special',
        threshold: 0,
        icon: 'CalendarCheck',
    },
    {
        slug: 'language-conqueror',
        name: 'Language Conqueror',
        description: 'Play daily in 10+ languages in a single day',
        category: 'special',
        threshold: 10,
        icon: 'Map',
    },
    {
        slug: 'the-impossible',
        name: 'The Impossible',
        description: 'Complete every daily mode in every language in a single day',
        category: 'special',
        threshold: 0,
        icon: 'Crown',
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
