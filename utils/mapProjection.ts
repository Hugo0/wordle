/**
 * Shared map projection — absolute UMAP positions in a pannable,
 * zoomable viewport.
 *
 * Both the Semantic Explorer game's `SemanticMap.vue` and the Word
 * Explorer's `WordCompareMap.vue` use the same coordinate system: every
 * word lives at its true UMAP (x, y). The viewport is centered on a
 * "focus" word (the game's target, the word page's primary) and the
 * camera zooms in to fit the interesting cluster.
 *
 * Why not polar with rank-based radius? UMAP is locally faithful — top
 * neighbors really are visually close — and using its real positions
 * gives us:
 *   • a stable, learnable map ("dog is always over here")
 *   • a density heatmap that actually corresponds to the dots
 *   • landmarks/extended-neighborhood that share one coordinate system
 *   • code that's the same for both surfaces
 *
 * The lossiness of UMAP for distance is mitigated by encoding warmth
 * via dot color/opacity instead of radius. Position carries the
 * spatial story; color carries the rank story.
 */

/**
 * Project a UMAP position to canvas pixel coordinates.
 *
 * @param wordUmap        the word's UMAP coordinate in [0, 1]²
 * @param viewportCenter  the UMAP coord that should sit at canvas center
 *                        (the game's target, the word page's primary)
 * @param canvasSize      canvas edge length in pixels
 * @param zoom            1.0 fits the entire UMAP [0, 1]² inside the
 *                        canvas; values > 1 zoom in, < 1 zoom out
 * @param margin          inner padding in pixels (game's slice mode
 *                        uses a larger margin for axis labels)
 */
export function projectToCanvas(
    wordUmap: readonly [number, number],
    viewportCenter: readonly [number, number],
    canvasSize: number,
    zoom: number = 1.0,
    margin: number = 0
): [number, number] {
    const inner = canvasSize - margin * 2;
    const dx = (wordUmap[0] - viewportCenter[0]) * zoom;
    const dy = (wordUmap[1] - viewportCenter[1]) * zoom;
    return [
        margin + inner * (0.5 + dx),
        margin + inner * (0.5 - dy), // flip Y because canvas Y grows downward
    ];
}
