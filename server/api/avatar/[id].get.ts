/**
 * GET /api/avatar/:id — Generate a deterministic marble-style SVG avatar.
 *
 * Based on boring-avatars' marble algorithm — organic, watercolor-like shapes
 * that match our editorial design system. Deterministic from the user ID.
 * Cached forever (immutable).
 *
 * Color palette: warm, muted editorial tones from our design tokens.
 */

// Editorial palette — 5 colors per set, warm muted tones
const PALETTES = [
    ['#8B7355', '#6B7C6E', '#D4C5A9', '#B5C4B1', '#A69279'],
    ['#7B6B8A', '#6B7B8A', '#C4B5D0', '#B5C4D0', '#9A8BA6'],
    ['#8A6B6B', '#8A7B6B', '#D0B5B5', '#D0C4B5', '#A68585'],
    ['#6B8A7B', '#6B6B8A', '#B5D0C4', '#B5B5D0', '#85A695'],
    ['#7B6B6B', '#8A8A6B', '#C4B5B5', '#D0D0B5', '#A69585'],
];

const SIZE = 80;

function hashCode(name: string): number {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = ((hash << 5) - hash + name.charCodeAt(i)) | 0;
    }
    return Math.abs(hash);
}

function getUnit(number: number, range: number, index?: number): number {
    const value = number % range;
    if (index && Math.floor((number / Math.pow(10, index)) % 10) % 2 === 0) {
        return -value;
    }
    return value;
}

function getRandomColor(number: number, colors: string[], range: number): string {
    return colors[number % range]!;
}

function generateMarble(id: string): string {
    const num = hashCode(id);
    const colors = PALETTES[num % PALETTES.length]!;
    const range = colors.length;
    const maskID = `m${num}`;

    const elements = Array.from({ length: 3 }, (_, i) => ({
        color: getRandomColor(num + i, colors, range),
        translateX: getUnit(num * (i + 1), SIZE / 10, 1),
        translateY: getUnit(num * (i + 1), SIZE / 10, 2),
        scale: 1.2 + getUnit(num * (i + 1), SIZE / 20) / 10,
        rotate: getUnit(num * (i + 1), 360, 1),
    }));

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SIZE} ${SIZE}" width="${SIZE}" height="${SIZE}" fill="none">
  <mask id="${maskID}" maskUnits="userSpaceOnUse" x="0" y="0" width="${SIZE}" height="${SIZE}">
    <rect width="${SIZE}" height="${SIZE}" rx="${SIZE * 2}" fill="#FFF"/>
  </mask>
  <g mask="url(#${maskID})">
    <rect width="${SIZE}" height="${SIZE}" fill="${elements[0]!.color}"/>
    <path
      filter="url(#f_${maskID})"
      d="M32.414 59.35L50.376 70.5H72.5v-71H33.728L26.5 13.381l19.057 27.08L32.414 59.35z"
      fill="${elements[1]!.color}"
      transform="translate(${elements[1]!.translateX} ${elements[1]!.translateY}) rotate(${elements[1]!.rotate} ${SIZE / 2} ${SIZE / 2}) scale(${elements[2]!.scale})"
    />
    <path
      filter="url(#f_${maskID})"
      style="mix-blend-mode:overlay"
      d="M22.216 24L0 46.75l14.108 38.129L78 86l-3.081-59.276-22.378 4.005 12.972 20.186-23.35 27.395L22.215 24z"
      fill="${elements[2]!.color}"
      transform="translate(${elements[2]!.translateX} ${elements[2]!.translateY}) rotate(${elements[2]!.rotate} ${SIZE / 2} ${SIZE / 2}) scale(${elements[2]!.scale})"
    />
  </g>
  <defs>
    <filter id="f_${maskID}" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
      <feFlood flood-opacity="0" result="bg"/>
      <feBlend in="SourceGraphic" in2="bg" result="shape"/>
      <feGaussianBlur stdDeviation="7" result="blur"/>
    </filter>
  </defs>
</svg>`;
}

export default defineEventHandler((event) => {
    const id = getRouterParam(event, 'id') || 'default';

    setResponseHeaders(event, {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, max-age=31536000, immutable',
    });

    return generateMarble(id);
});
