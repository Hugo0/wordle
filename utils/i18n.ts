/** Translate an English part-of-speech label via language_config UI keys. */
export function translatePos(pos: string | undefined | null, ui?: Record<string, string>): string {
    if (!pos || pos === 'other') return '';
    return ui?.[`pos_${pos.toLowerCase()}`] ?? pos;
}
