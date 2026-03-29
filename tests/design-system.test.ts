/**
 * Design System tests
 *
 * Tests for the design token system, flag composable, and new components.
 * Ensures the editorial design system is correctly integrated.
 */
import { describe, it, expect } from 'vitest';
import { useFlag, useFlagCountryCode } from '../composables/useFlag';

// ---------------------------------------------------------------------------
// useFlag composable
// ---------------------------------------------------------------------------

describe('useFlag', () => {
    it('maps common languages to flag paths', () => {
        expect(useFlag('en')).toBe('/flags/gb.svg');
        expect(useFlag('fi')).toBe('/flags/fi.svg');
        expect(useFlag('ar')).toBe('/flags/sa.svg');
        expect(useFlag('de')).toBe('/flags/de.svg');
        expect(useFlag('ja')).toBe('/flags/jp.svg');
        expect(useFlag('ko')).toBe('/flags/kr.svg');
        expect(useFlag('he')).toBe('/flags/il.svg');
        expect(useFlag('uk')).toBe('/flags/ua.svg');
        expect(useFlag('pt')).toBe('/flags/pt.svg');
        expect(useFlag('fr')).toBe('/flags/fr.svg');
    });

    it('returns null for constructed/fictional languages', () => {
        expect(useFlag('eo')).toBeNull(); // Esperanto
        expect(useFlag('tlh')).toBeNull(); // Klingon
        expect(useFlag('qya')).toBeNull(); // Quenya
    });

    it('returns null for unknown language codes', () => {
        expect(useFlag('zz')).toBeNull();
        expect(useFlag('')).toBeNull();
        expect(useFlag('xyz')).toBeNull();
    });

    it('handles edge case mappings correctly', () => {
        // Languages where lang code ≠ country code
        expect(useFlag('cs')).toBe('/flags/cz.svg'); // Czech → Czechia
        expect(useFlag('da')).toBe('/flags/dk.svg'); // Danish → Denmark
        expect(useFlag('el')).toBe('/flags/gr.svg'); // Greek → Greece
        expect(useFlag('sv')).toBe('/flags/se.svg'); // Swedish → Sweden
        expect(useFlag('sl')).toBe('/flags/si.svg'); // Slovenian → Slovenia
        expect(useFlag('sq')).toBe('/flags/al.svg'); // Albanian → Albania
        expect(useFlag('nb')).toBe('/flags/no.svg'); // Norwegian Bokmål → Norway
        expect(useFlag('nn')).toBe('/flags/no.svg'); // Norwegian Nynorsk → Norway
    });

    it('maps regional languages to sub-national or ethnic flags', () => {
        expect(useFlag('ca')).toBe('/flags/es-ct.svg'); // Catalan → Catalonia
        expect(useFlag('eu')).toBe('/flags/es-pv.svg'); // Basque → Basque Country
        expect(useFlag('gl')).toBe('/flags/es-ga.svg'); // Galician → Galicia
        expect(useFlag('oc')).toBe('/flags/occitania.svg'); // Occitan → Occitania
        expect(useFlag('br')).toBe('/flags/fr-bre.svg'); // Breton → Brittany
        expect(useFlag('gd')).toBe('/flags/gb-sct.svg'); // Scottish Gaelic → Scotland
        expect(useFlag('mi')).toBe('/flags/maori.svg'); // Māori → Māori flag
        expect(useFlag('ha')).toBe('/flags/hausa.svg'); // Hausa → Hausa flag
        expect(useFlag('yo')).toBe('/flags/yorubaland.svg'); // Yoruba → Yorubaland
        expect(useFlag('fy')).toBe('/flags/nl.svg'); // Frisian → Netherlands
        expect(useFlag('fur')).toBe('/flags/it.svg'); // Friulian → Italy
        expect(useFlag('nds')).toBe('/flags/de.svg'); // Low German → Germany
    });
});

describe('useFlagCountryCode', () => {
    it('returns the flag code for a language', () => {
        expect(useFlagCountryCode('en')).toBe('gb');
        expect(useFlagCountryCode('de')).toBe('de');
        expect(useFlagCountryCode('ja')).toBe('jp');
        expect(useFlagCountryCode('ca')).toBe('es-ct');
        expect(useFlagCountryCode('gd')).toBe('gb-sct');
    });

    it('returns null for unknown languages', () => {
        expect(useFlagCountryCode('eo')).toBeNull();
        expect(useFlagCountryCode('zz')).toBeNull();
    });
});

// ---------------------------------------------------------------------------
// Design token CSS file existence
// ---------------------------------------------------------------------------

describe('design system files', () => {
    it('design-system.css exists and is importable', async () => {
        const fs = await import('fs');
        const path = await import('path');
        const cssPath = path.resolve(__dirname, '../assets/css/design-system.css');
        expect(fs.existsSync(cssPath)).toBe(true);

        const content = fs.readFileSync(cssPath, 'utf-8');
        // Verify key tokens are defined
        expect(content).toContain('--color-ink');
        expect(content).toContain('--color-paper');
        expect(content).toContain('--color-accent');
        expect(content).toContain('--color-correct');
        expect(content).toContain('--color-semicorrect');
        expect(content).toContain('--color-rule');
        expect(content).toContain('--font-display');
        expect(content).toContain('--font-body');
        expect(content).toContain('--font-mono');
    });

    it('design-system.css has dark mode overrides', async () => {
        const fs = await import('fs');
        const path = await import('path');
        const cssPath = path.resolve(__dirname, '../assets/css/design-system.css');
        const content = fs.readFileSync(cssPath, 'utf-8');

        // Dark mode block exists
        expect(content).toContain('.dark {');
        // Dark mode overrides key tokens
        expect(content).toMatch(/\.dark\s*\{[^}]*--color-ink/);
        expect(content).toMatch(/\.dark\s*\{[^}]*--color-paper/);
    });

    it('design-system.css has editorial utility classes', async () => {
        const fs = await import('fs');
        const path = await import('path');
        const cssPath = path.resolve(__dirname, '../assets/css/design-system.css');
        const content = fs.readFileSync(cssPath, 'utf-8');

        expect(content).toContain('.heading-display');
        expect(content).toContain('.heading-section');
        expect(content).toContain('.heading-body');
        expect(content).toContain('.mono-label');
        expect(content).toContain('.editorial-rule');
        expect(content).toContain('.editorial-tagline');
        expect(content).toContain('.flag-icon');
    });

    it('main.css imports design-system.css', async () => {
        const fs = await import('fs');
        const path = await import('path');
        const mainCssPath = path.resolve(__dirname, '../assets/css/main.css');
        const content = fs.readFileSync(mainCssPath, 'utf-8');

        expect(content).toContain('./design-system.css');
    });
});

// ---------------------------------------------------------------------------
// Flag files existence (spot check)
// ---------------------------------------------------------------------------

describe('circle flag files', () => {
    it('flag SVGs exist for major languages', async () => {
        const fs = await import('fs');
        const path = await import('path');
        const flagsDir = path.resolve(__dirname, '../public/flags');

        const requiredFlags = [
            'gb',
            'fi',
            'sa',
            'de',
            'es',
            'fr',
            'it',
            'pt',
            'jp',
            'kr',
            'il',
            'es-ct',
            'es-pv',
            'es-ga',
            'gb-sct',
            'fr-bre',
            'occitania',
            'maori',
            'hausa',
            'yorubaland',
        ];
        for (const code of requiredFlags) {
            const flagPath = path.join(flagsDir, `${code}.svg`);
            expect(fs.existsSync(flagPath), `Flag ${code}.svg should exist`).toBe(true);
        }
    });
});

// ---------------------------------------------------------------------------
// Component file existence
// ---------------------------------------------------------------------------

describe('new component files', () => {
    it('GameHeader.vue uses Lucide imports', async () => {
        const fs = await import('fs');
        const path = await import('path');
        const filePath = path.resolve(__dirname, '../components/game/GameHeader.vue');
        const content = fs.readFileSync(filePath, 'utf-8');

        expect(content).toContain('lucide-vue-next');
        expect(content).toContain('Info');
        expect(content).toContain('Menu');
        expect(content).toContain('BarChart2');
        expect(content).toContain('Settings');
        // Should NOT contain inline SVGs anymore
        expect(content).not.toContain('xmlns="http://www.w3.org/2000/svg"');
    });

    it('AppSidebar.vue exists with correct structure', async () => {
        const fs = await import('fs');
        const path = await import('path');
        const filePath = path.resolve(__dirname, '../components/app/AppSidebar.vue');
        expect(fs.existsSync(filePath)).toBe(true);

        const content = fs.readFileSync(filePath, 'utf-8');
        expect(content).toContain('sidebar');
        expect(content).toContain('isOpen');
        expect(content).toContain('close');
        expect(content).toContain('selectMode');
        expect(content).toContain('GAME_MODES_UI');
    });

    it('SidebarItem.vue exists', async () => {
        const fs = await import('fs');
        const path = await import('path');
        const filePath = path.resolve(__dirname, '../components/app/SidebarItem.vue');
        expect(fs.existsSync(filePath)).toBe(true);
    });
});
