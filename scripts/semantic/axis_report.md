# Semantic Explorer — Axis Discovery Report

584 candidates scored (25 hand, 516 llm, 43 both). Composite = 0.45·variance_rank + 0.35·pca_alignment + 0.20·auc_margin. AUC gate at 0.75. Selection: farthest-first + 1-swap local search to jointly max orthogonality across 80 axes.

**Accepted: 74** · **Eligible but not selected: 321** · **Low AUC: 189**

**Max pairwise |cos|: 0.236** (lower = more orthogonal)  
**Mean pairwise |cos|: 0.073**

## All candidates (ranked by composite)

Status: ✓ accepted · · eligible but not picked · ✗ dropped (below AUC gate)

| Rank | St | Src | Axis | Anchors | AUC | Var | PCA | Comp | Status detail |
|------|----|-----|------|---------|-----|-----|-----|------|----------------|
| 1 | ✗ | L | wisdom | foolish ↔ wise | 1.000 | 0.077 | 0.473 | 0.814 | AUC 1.00 |
| 2 | · | L | fitness | unfit ↔ fit | 1.000 | 0.083 | 0.467 | 0.814 | closest: neglect (0.28) |
| 3 | ✗ | L | clean_cut | ragged ↔ trim | 1.000 | 0.077 | 0.437 | 0.800 | AUC 1.00 |
| 4 | · | L | stability | wobbly ↔ steady | 1.000 | 0.077 | 0.428 | 0.796 | closest: coverage (0.37) |
| 5 | ✗ | B | order | chaotic ↔ ordered | 1.000 | 0.076 | 0.409 | 0.786 | AUC 1.00 |
| 6 | · | L | liking | hated ↔ liked | 1.000 | 0.076 | 0.404 | 0.785 | closest: morality (0.27) |
| 7 | ✗ | L | justice | unjust ↔ just | 1.000 | 0.078 | 0.388 | 0.785 | AUC 1.00 |
| 8 | · | L | approval | disapproved ↔ approved | 1.000 | 0.076 | 0.400 | 0.781 | closest: coverage (0.28) |
| 9 | · | L | agreement_level | opposed ↔ aligned | 1.000 | 0.075 | 0.391 | 0.777 | closest: alignment (0.45) |
| 10 | · | L | inclusion | excluded ↔ included | 1.000 | 0.074 | 0.395 | 0.770 | closest: alignment (0.30) |
| 11 | · | L | legality | illegal ↔ legal | 1.000 | 0.077 | 0.347 | 0.766 | closest: crime (0.27) |
| 12 | · | L | absence | present ↔ absent | 1.000 | 0.075 | 0.363 | 0.765 | closest: temperature_food (0.24) |
| 13 | · | L | presence | absent ↔ present | 1.000 | 0.075 | 0.363 | 0.765 | closest: temperature_food (0.24) |
| 14 | · | L | reason | irrational ↔ rational | 1.000 | 0.075 | 0.358 | 0.765 | closest: neglect (0.33) |
| 15 | · | L | connection | disconnected ↔ connected | 0.996 | 0.074 | 0.364 | 0.760 | closest: contact (0.33) |
| 16 | · | L | cooperation | uncooperative ↔ cooperative | 0.951 | 0.077 | 0.420 | 0.753 | closest: neglect (0.26) |
| 17 | · | L | friend_foe | enemy ↔ ally | 1.000 | 0.074 | 0.353 | 0.753 | closest: morality (0.36) |
| 18 | · | L | utility | impractical ↔ practical | 0.996 | 0.073 | 0.373 | 0.750 | closest: portable (0.36) |
| 19 | · | L | loyalty | disloyal ↔ loyal | 1.000 | 0.074 | 0.318 | 0.743 | closest: confidence (0.33) |
| 20 | ✓ | L | **terrain** | level ↔ mountainous | 1.000 | 0.072 | 0.363 | 0.743 | rank 24 |
| 21 | · | L | crumbliness | solid ↔ crumbly | 1.000 | 0.075 | 0.303 | 0.743 | closest: curvature (0.33) |
| 22 | · | L | purge | polluted ↔ clean | 1.000 | 0.074 | 0.299 | 0.738 | closest: terrain (0.23) |
| 23 | · | L | organization | jumbled ↔ organized | 1.000 | 0.073 | 0.319 | 0.736 | closest: coverage (0.38) |
| 24 | ✓ | L | **growth** | stunted ↔ grown | 1.000 | 0.075 | 0.270 | 0.735 | rank 40 |
| 25 | · | L | logic | illogical ↔ logical | 0.947 | 0.073 | 0.423 | 0.733 | closest: coverage (0.27) |
| 26 | · | L | kindness | cruel ↔ kind | 1.000 | 0.072 | 0.326 | 0.732 | closest: morality (0.33) |
| 27 | · | L | hostility | friendly ↔ hostile | 1.000 | 0.074 | 0.270 | 0.730 | closest: morality (0.39) |
| 28 | · | L | interest | dull ↔ interesting | 1.000 | 0.070 | 0.367 | 0.729 | closest: dullness (0.48) |
| 29 | · | B | friendliness | hostile ↔ friendly | 1.000 | 0.074 | 0.270 | 0.729 | closest: morality (0.39) |
| 30 | · | L | fairness | unfair ↔ fair | 1.000 | 0.072 | 0.327 | 0.728 | closest: confidence (0.28) |
| 31 | · | L | coherence | incoherent ↔ coherent | 1.000 | 0.073 | 0.294 | 0.727 | closest: confidence (0.35) |
| 32 | · | L | stubbornness | flexible ↔ stubborn | 1.000 | 0.071 | 0.340 | 0.725 | closest: flexibility_mind (0.66) |
| 33 | · | L | friendliness_tone | unfriendly ↔ friendly | 0.978 | 0.074 | 0.318 | 0.724 | closest: morality (0.32) |
| 34 | ✗ | L | permission | prohibited ↔ allowed | 0.998 | 0.072 | 0.311 | 0.722 | AUC 1.00 |
| 35 | ✗ | L | membership | outsider ↔ member | 1.000 | 0.071 | 0.322 | 0.722 | AUC 1.00 |
| 36 | ✓ | L | **coverage** | patchy ↔ complete | 1.000 | 0.073 | 0.275 | 0.718 | rank 43 |
| 37 | · | L | efficiency | inefficient ↔ efficient | 1.000 | 0.071 | 0.304 | 0.718 | closest: coverage (0.29) |
| 38 | · | L | fertility | infertile ↔ fertile | 1.000 | 0.073 | 0.270 | 0.716 | closest: growth (0.34) |
| 39 | · | L | equality | unequal ↔ equal | 0.962 | 0.073 | 0.355 | 0.715 | closest: coverage (0.37) |
| 40 | ✗ | L | firmness | spongy ↔ firm | 1.000 | 0.071 | 0.303 | 0.714 | AUC 1.00 |
| 41 | · | L | contamination | clean ↔ contaminated | 1.000 | 0.072 | 0.268 | 0.714 | closest: neglect (0.22) |
| 42 | · | L | focus | distracted ↔ focused | 0.993 | 0.070 | 0.352 | 0.711 | closest: honesty_tone (0.26) |
| 43 | · | L | support | opposed ↔ supportive | 1.000 | 0.071 | 0.298 | 0.711 | closest: morality (0.29) |
| 44 | ✗ | L | levelness | tilted ↔ level | 1.000 | 0.071 | 0.285 | 0.710 | AUC 1.00 |
| 45 | · | L | segmentation | whole ↔ fragmented | 1.000 | 0.072 | 0.274 | 0.710 | closest: coverage (0.47) |
| 46 | · | L | corruption | pure ↔ corrupt | 1.000 | 0.072 | 0.257 | 0.709 | closest: rust (0.39) |
| 47 | · | L | purity_moral | corrupt ↔ pure | 1.000 | 0.072 | 0.257 | 0.708 | closest: rust (0.39) |
| 48 | · | L | chaos | orderly ↔ chaotic | 1.000 | 0.071 | 0.289 | 0.707 | closest: turbulence (0.33) |
| 49 | ✓ | L | **neglect** | maintained ↔ neglected | 1.000 | 0.070 | 0.324 | 0.706 | rank 49 |
| 50 | · | L | orderliness | chaotic ↔ orderly | 1.000 | 0.071 | 0.289 | 0.706 | closest: turbulence (0.33) |
| 51 | · | L | maintenance | neglected ↔ maintained | 1.000 | 0.070 | 0.324 | 0.705 | closest: neglect (1.00) |
| 52 | · | L | capacity | cramped ↔ spacious | 1.000 | 0.072 | 0.253 | 0.705 | closest: tempo (0.32) |
| 53 | · | L | possession | unowned ↔ owned | 0.991 | 0.070 | 0.335 | 0.705 | closest: function (0.25) |
| 54 | · | L | reputation | disgraced ↔ respected | 1.000 | 0.070 | 0.306 | 0.703 | closest: neatness (0.25) |
| 55 | ✗ | L | attachment | detached ↔ attached | 1.000 | 0.070 | 0.331 | 0.702 | AUC 1.00 |
| 56 | ✗ | L | compactness | bulky ↔ compact | 1.000 | 0.069 | 0.346 | 0.700 | AUC 1.00 |
| 57 | · | L | stability_social | unstable ↔ stable | 0.929 | 0.073 | 0.374 | 0.700 | closest: coverage (0.29) |
| 58 | · | L | agreement | discordant ↔ concordant | 0.987 | 0.070 | 0.328 | 0.699 | closest: coverage (0.40) |
| 59 | · | L | stability_mind | unstable ↔ stable | 0.929 | 0.073 | 0.374 | 0.699 | closest: coverage (0.29) |
| 60 | · | B | danger | safe ↔ dangerous | 0.973 | 0.070 | 0.337 | 0.698 | closest: fear (0.39) |
| 61 | · | L | status | lowly ↔ noble | 1.000 | 0.071 | 0.269 | 0.696 | closest: speed_motion (0.25) |
| 62 | · | L | counterfeit | genuine ↔ counterfeit | 1.000 | 0.071 | 0.252 | 0.696 | closest: growth (0.35) |
| 63 | · | L | muffling | clear ↔ muffled | 1.000 | 0.070 | 0.273 | 0.693 | closest: bravery (0.28) |
| 64 | · | L | clarity_sound | muffled ↔ clear | 1.000 | 0.070 | 0.273 | 0.692 | closest: bravery (0.28) |
| 65 | ✓ | B | **morality** | evil ↔ good | 1.000 | 0.070 | 0.303 | 0.691 | rank 26 |
| 66 | · | L | security | insecure ↔ secure | 0.951 | 0.070 | 0.406 | 0.690 | closest: confidence (0.42) |
| 67 | · | L | shape_straight | crooked ↔ straight | 1.000 | 0.069 | 0.357 | 0.689 | closest: curvature (0.63) |
| 68 | · | L | variety | uniform ↔ varied | 1.000 | 0.069 | 0.330 | 0.688 | closest: curvature (0.34) |
| 69 | ✓ | L | **function** | broken ↔ working | 1.000 | 0.069 | 0.315 | 0.688 | rank 25 |
| 70 | · | L | uniformity | varied ↔ uniform | 1.000 | 0.069 | 0.330 | 0.687 | closest: curvature (0.34) |
| 71 | · | L | roughness | smooth ↔ rugged | 1.000 | 0.070 | 0.253 | 0.687 | closest: softness (0.27) |
| 72 | · | L | legibility | illegible ↔ legible | 1.000 | 0.069 | 0.305 | 0.682 | closest: neglect (0.31) |
| 73 | · | L | rule | lawless ↔ lawful | 1.000 | 0.069 | 0.296 | 0.682 | closest: crime (0.41) |
| 74 | · | L | ripeness | unripe ↔ ripe | 1.000 | 0.069 | 0.278 | 0.681 | closest: dullness (0.27) |
| 75 | ✗ | L | taste_richness | watery ↔ rich | 1.000 | 0.070 | 0.259 | 0.680 | AUC 1.00 |
| 76 | · | L | prestige | disreputable ↔ prestigious | 0.991 | 0.071 | 0.207 | 0.678 | closest: bravery (0.26) |
| 77 | · | L | aggression | docile ↔ ferocious | 1.000 | 0.068 | 0.333 | 0.678 | closest: tenderness (0.30) |
| 78 | · | L | acceleration | sluggish ↔ rapid | 0.996 | 0.070 | 0.262 | 0.677 | closest: dullness (0.39) |
| 79 | ✗ | L | shape_round | angular ↔ round | 1.000 | 0.069 | 0.303 | 0.676 | AUC 1.00 |
| 80 | · | L | materiality | immaterial ↔ material | 0.929 | 0.073 | 0.302 | 0.675 | closest: gasiness (0.27) |
| 81 | · | L | loss | profitable ↔ unprofitable | 0.929 | 0.074 | 0.288 | 0.673 | closest: confidence (0.40) |
| 82 | · | L | profit | unprofitable ↔ profitable | 0.929 | 0.074 | 0.288 | 0.672 | closest: confidence (0.40) |
| 83 | · | L | rough | polished ↔ rough | 1.000 | 0.068 | 0.328 | 0.672 | closest: crime (0.25) |
| 84 | ✓ | L | **flexibility_mind** | dogmatic ↔ flexible | 1.000 | 0.069 | 0.258 | 0.672 | rank 17 |
| 85 | · | L | polish | rough ↔ polished | 1.000 | 0.068 | 0.328 | 0.671 | closest: crime (0.25) |
| 86 | · | L | respect | disrespectful ↔ respectful | 0.889 | 0.074 | 0.361 | 0.671 | closest: neglect (0.34) |
| 87 | · | L | vice | virtuous ↔ vicious | 0.987 | 0.070 | 0.258 | 0.671 | closest: rust (0.32) |
| 88 | · | L | virtue | vicious ↔ virtuous | 0.987 | 0.070 | 0.258 | 0.670 | closest: rust (0.32) |
| 89 | · | L | stability_time | fleeting ↔ stable | 1.000 | 0.069 | 0.281 | 0.668 | closest: flow (0.33) |
| 90 | · | L | comfort | uncomfortable ↔ comfortable | 0.893 | 0.076 | 0.316 | 0.668 | closest: confidence (0.45) |
| 91 | · | H | edible | inedible ↔ edible | 0.984 | 0.069 | 0.294 | 0.667 | closest: portable (0.31) |
| 92 | · | L | relevance | irrelevant ↔ relevant | 1.000 | 0.068 | 0.347 | 0.667 | closest: junkiness (0.31) |
| 93 | · | L | operability | inoperable ↔ operable | 0.947 | 0.070 | 0.312 | 0.666 | closest: portable (0.38) |
| 94 | · | L | oscillation | steady ↔ waving | 1.000 | 0.069 | 0.285 | 0.666 | closest: flow (0.37) |
| 95 | ✓ | L | **resonant** | dead ↔ ringing | 1.000 | 0.068 | 0.366 | 0.665 | rank 10 |
| 96 | · | B | size | tiny ↔ enormous | 1.000 | 0.070 | 0.225 | 0.665 | closest: height (0.29) |
| 97 | · | L | happiness | miserable ↔ happy | 1.000 | 0.069 | 0.230 | 0.665 | closest: sadness (0.37) |
| 98 | ✗ | L | chastity | unchaste ↔ chaste | 0.996 | 0.069 | 0.241 | 0.664 | AUC 1.00 |
| 99 | ✓ | L | **softness** | squishy ↔ rigid | 1.000 | 0.069 | 0.260 | 0.662 | rank 57 |
| 100 | · | L | honesty | dishonest ↔ honest | 1.000 | 0.068 | 0.297 | 0.662 | closest: morality (0.34) |
| 101 | · | L | magnitude | minor ↔ major | 0.973 | 0.069 | 0.338 | 0.661 | closest: authority (0.33) |
| 102 | · | L | proportion | minor ↔ major | 0.973 | 0.069 | 0.338 | 0.660 | closest: authority (0.33) |
| 103 | · | L | completeness_obj | incomplete ↔ complete | 0.991 | 0.069 | 0.282 | 0.659 | closest: coverage (0.58) |
| 104 | · | L | fashion | unfashionable ↔ fashionable | 0.933 | 0.071 | 0.288 | 0.657 | closest: neglect (0.29) |
| 105 | · | L | attractiveness | unattractive ↔ attractive | 0.942 | 0.071 | 0.261 | 0.657 | closest: confidence (0.33) |
| 106 | · | L | luxury_style | plain ↔ ornate | 1.000 | 0.069 | 0.232 | 0.656 | closest: curvature (0.31) |
| 107 | · | L | simplicity_text | convoluted ↔ plain | 1.000 | 0.069 | 0.258 | 0.656 | closest: mystery (0.29) |
| 108 | · | L | involvement | uninvolved ↔ involved | 1.000 | 0.068 | 0.286 | 0.656 | closest: tone (0.28) |
| 109 | · | L | gentleness | forceful ↔ gentle | 1.000 | 0.069 | 0.212 | 0.655 | closest: lethality (0.35) |
| 110 | · | L | force | gentle ↔ forceful | 1.000 | 0.069 | 0.212 | 0.654 | closest: lethality (0.35) |
| 111 | · | L | access | forbidden ↔ permitted | 0.964 | 0.069 | 0.286 | 0.654 | closest: bitterness (0.35) |
| 112 | · | L | healthiness | unhealthy ↔ healthy | 0.973 | 0.069 | 0.319 | 0.652 | closest: junkiness (0.48) |
| 113 | · | L | quality | shoddy ↔ excellent | 1.000 | 0.069 | 0.221 | 0.651 | closest: coverage (0.38) |
| 114 | · | L | aliveness | dead ↔ alive | 0.942 | 0.070 | 0.278 | 0.650 | closest: resonant (0.39) |
| 115 | · | L | ashiness | solid ↔ ashy | 1.000 | 0.068 | 0.306 | 0.650 | closest: coverage (0.36) |
| 116 | · | L | availability | unavailable ↔ available | 0.938 | 0.069 | 0.348 | 0.646 | closest: certainty (0.27) |
| 117 | ✓ | L | **alignment** | askew ↔ aligned | 1.000 | 0.068 | 0.262 | 0.645 | rank 45 |
| 118 | · | L | meagerness | rich ↔ meager | 1.000 | 0.068 | 0.237 | 0.644 | closest: growth (0.32) |
| 119 | · | L | richness | meager ↔ rich | 1.000 | 0.068 | 0.237 | 0.643 | closest: growth (0.32) |
| 120 | · | L | control | uncontrolled ↔ controlled | 1.000 | 0.068 | 0.296 | 0.642 | closest: turbulence (0.30) |
| 121 | · | L | duration | brief ↔ prolonged | 1.000 | 0.068 | 0.262 | 0.642 | closest: height (0.32) |
| 122 | · | L | tarnish | polished ↔ tarnished | 0.916 | 0.071 | 0.302 | 0.642 | closest: confidence (0.30) |
| 123 | · | L | clean_polish | tarnished ↔ polished | 0.916 | 0.071 | 0.302 | 0.641 | closest: confidence (0.30) |
| 124 | · | L | harmony | dissonant ↔ harmonic | 1.000 | 0.068 | 0.290 | 0.641 | closest: conflict (0.39) |
| 125 | · | L | pessimism | optimistic ↔ pessimistic | 0.978 | 0.069 | 0.254 | 0.640 | closest: sadness (0.36) |
| 126 | ✗ | L | collision | missed ↔ hit | 1.000 | 0.067 | 0.314 | 0.640 | AUC 1.00 |
| 127 | · | L | optimism | pessimistic ↔ optimistic | 0.978 | 0.069 | 0.254 | 0.639 | closest: sadness (0.36) |
| 128 | · | H | familiarity | unfamiliar ↔ familiar | 0.991 | 0.068 | 0.308 | 0.639 | closest: similarity (0.37) |
| 129 | · | L | brutality | gentle ↔ brutal | 1.000 | 0.068 | 0.238 | 0.636 | closest: fear (0.36) |
| 130 | ✓ | L | **turbulence** | laminar ↔ turbulent | 1.000 | 0.068 | 0.257 | 0.636 | rank 65 |
| 131 | · | L | violence_force | gentle ↔ brutal | 1.000 | 0.068 | 0.238 | 0.635 | closest: fear (0.36) |
| 132 | · | L | murkiness | clear ↔ murky | 0.996 | 0.068 | 0.252 | 0.633 | closest: mystery (0.34) |
| 133 | · | L | water_clarity | murky ↔ clear | 0.996 | 0.068 | 0.252 | 0.633 | closest: mystery (0.34) |
| 134 | · | L | safety | hazardous ↔ safe | 0.996 | 0.067 | 0.297 | 0.632 | closest: fear (0.32) |
| 135 | · | L | elegance | clumsy ↔ elegant | 1.000 | 0.068 | 0.208 | 0.632 | closest: junkiness (0.25) |
| 136 | ✗ | L | clean_living | debauched ↔ temperate | 1.000 | 0.068 | 0.258 | 0.631 | AUC 1.00 |
| 137 | · | L | vitality | lifeless ↔ lively | 1.000 | 0.067 | 0.270 | 0.630 | closest: sadness (0.32) |
| 138 | · | L | extremity | moderate ↔ extreme | 1.000 | 0.068 | 0.251 | 0.630 | closest: bitterness (0.38) |
| 139 | · | L | resonance | dead ↔ resonant | 1.000 | 0.067 | 0.328 | 0.630 | closest: resonant (0.61) |
| 140 | · | L | violence | peaceful ↔ violent | 1.000 | 0.068 | 0.207 | 0.627 | closest: crime (0.39) |
| 141 | ✗ | L | closure | ajar ↔ closed | 1.000 | 0.068 | 0.236 | 0.626 | AUC 1.00 |
| 142 | ✓ | L | **conflict** | harmony ↔ conflict | 1.000 | 0.068 | 0.213 | 0.626 | rank 41 |
| 143 | ✗ | L | readability | unreadable ↔ readable | 1.000 | 0.067 | 0.287 | 0.626 | AUC 1.00 |
| 144 | ✗ | L | obedience | rebellious ↔ obedient | 0.984 | 0.068 | 0.238 | 0.625 | AUC 0.98 |
| 145 | · | B | beauty | ugly ↔ beautiful | 0.993 | 0.067 | 0.268 | 0.625 | closest: junkiness (0.34) |
| 146 | · | L | trend | outdated ↔ trendy | 1.000 | 0.068 | 0.215 | 0.625 | closest: newness (0.30) |
| 147 | ✓ | L | **junkiness** | healthy ↔ junk | 1.000 | 0.067 | 0.254 | 0.624 | rank 36 |
| 148 | ✓ | L | **pattern** | random ↔ patterned | 1.000 | 0.066 | 0.338 | 0.623 | rank 44 |
| 149 | · | L | randomness | patterned ↔ random | 1.000 | 0.066 | 0.338 | 0.622 | closest: pattern (1.00) |
| 150 | ✗ | L | directionality | backward ↔ forward | 0.942 | 0.069 | 0.294 | 0.622 | AUC 0.94 |
| 151 | ✓ | L | **contact** | separated ↔ touching | 1.000 | 0.067 | 0.250 | 0.622 | rank 14 |
| 152 | · | B | power | weak ↔ powerful | 0.993 | 0.067 | 0.301 | 0.620 | closest: confidence (0.33) |
| 153 | ✓ | L | **crime** | lawful ↔ criminal | 1.000 | 0.067 | 0.253 | 0.619 | rank 6 |
| 154 | · | L | malleability | unyielding ↔ malleable | 1.000 | 0.067 | 0.275 | 0.618 | closest: flexibility_mind (0.39) |
| 155 | ✗ | L | humidity | arid ↔ drenched | 1.000 | 0.067 | 0.253 | 0.617 | AUC 1.00 |
| 156 | · | L | fame | unknown ↔ famous | 1.000 | 0.067 | 0.288 | 0.616 | closest: silence (0.34) |
| 157 | ✗ | L | memory | forgetful ↔ remembering | 0.958 | 0.068 | 0.309 | 0.615 | AUC 0.96 |
| 158 | ✗ | B | texture | smooth ↔ rough | 1.000 | 0.067 | 0.226 | 0.612 | AUC 1.00 |
| 159 | · | L | failure | successful ↔ failed | 0.984 | 0.068 | 0.219 | 0.612 | closest: function (0.37) |
| 160 | · | L | glittery | plain ↔ glittery | 1.000 | 0.067 | 0.242 | 0.611 | closest: sharpness_point (0.29) |
| 161 | · | L | success | failed ↔ successful | 0.984 | 0.068 | 0.219 | 0.611 | closest: function (0.37) |
| 162 | · | L | glitter | plain ↔ glittery | 1.000 | 0.067 | 0.242 | 0.610 | closest: sharpness_point (0.29) |
| 163 | · | L | warmth_social | cold ↔ welcoming | 1.000 | 0.067 | 0.258 | 0.608 | closest: newness (0.27) |
| 164 | · | L | generosity | miserly ↔ lavish | 1.000 | 0.067 | 0.236 | 0.606 | closest: fragrance (0.23) |
| 165 | ✓ | L | **alertness** | drowsy ↔ alert | 1.000 | 0.067 | 0.251 | 0.604 | rank 53 |
| 166 | · | L | innovation | traditional ↔ innovative | 1.000 | 0.065 | 0.344 | 0.604 | closest: newness (0.35) |
| 167 | · | L | commitment | uncommitted ↔ committed | 0.991 | 0.066 | 0.300 | 0.604 | closest: certainty (0.30) |
| 168 | · | H | flexibility | rigid ↔ flexible | 0.996 | 0.067 | 0.221 | 0.602 | closest: flexibility_mind (0.57) |
| 169 | ✗ | L | nutrition | unhealthy ↔ nutritious | 0.996 | 0.066 | 0.283 | 0.602 | AUC 1.00 |
| 170 | ✗ | L | liveliness | listless ↔ lively | 1.000 | 0.067 | 0.230 | 0.599 | AUC 1.00 |
| 171 | · | L | surprise | expected ↔ surprising | 1.000 | 0.066 | 0.280 | 0.599 | closest: alignment (0.25) |
| 172 | · | L | risk | safe ↔ risky | 0.956 | 0.068 | 0.256 | 0.598 | closest: silence (0.31) |
| 173 | · | L | difficulty | easy ↔ arduous | 1.000 | 0.067 | 0.227 | 0.597 | closest: value (0.28) |
| 174 | · | L | ductility | brittle ↔ ductile | 0.989 | 0.067 | 0.243 | 0.597 | closest: function (0.31) |
| 175 | · | L | brittleness | ductile ↔ brittle | 0.989 | 0.067 | 0.243 | 0.596 | closest: function (0.31) |
| 176 | · | L | grace | awkward ↔ graceful | 1.000 | 0.066 | 0.268 | 0.596 | closest: fragrance (0.27) |
| 177 | · | L | threat | nonthreatening ↔ menacing | 1.000 | 0.067 | 0.234 | 0.595 | closest: bitterness (0.34) |
| 178 | ✗ | L | patience | impatient ↔ patient | 1.000 | 0.065 | 0.340 | 0.595 | AUC 1.00 |
| 179 | · | L | rigidity | flexible ↔ stiff | 1.000 | 0.066 | 0.274 | 0.592 | closest: flexibility_mind (0.48) |
| 180 | · | L | regularity_time | sporadic ↔ regular | 0.960 | 0.067 | 0.286 | 0.592 | closest: coverage (0.36) |
| 181 | ✗ | B | wealth | poor ↔ rich | 1.000 | 0.066 | 0.277 | 0.592 | AUC 1.00 |
| 182 | · | L | diligence | lazy ↔ diligent | 1.000 | 0.066 | 0.258 | 0.590 | closest: value (0.25) |
| 183 | ✓ | L | **temperature_food** | chilled ↔ steaming | 1.000 | 0.066 | 0.274 | 0.589 | rank 5 |
| 184 | ✗ | L | surface | inner ↔ outer | 0.991 | 0.066 | 0.299 | 0.588 | AUC 0.99 |
| 185 | ✗ | L | original_copy | copy ↔ original | 1.000 | 0.066 | 0.235 | 0.587 | AUC 1.00 |
| 186 | ✗ | L | tautness | slack ↔ taut | 1.000 | 0.067 | 0.207 | 0.587 | AUC 1.00 |
| 187 | · | L | skill | unskilled ↔ skilled | 0.951 | 0.067 | 0.265 | 0.585 | closest: tone (0.30) |
| 188 | · | L | volume | minuscule ↔ colossal | 1.000 | 0.066 | 0.284 | 0.584 | closest: height (0.28) |
| 189 | · | L | pointiness | rounded ↔ spiked | 1.000 | 0.067 | 0.205 | 0.584 | closest: growth (0.29) |
| 190 | ✗ | L | candor | candid ↔ guarded | 1.000 | 0.066 | 0.243 | 0.584 | AUC 1.00 |
| 191 | · | B | usefulness | useless ↔ useful | 0.951 | 0.067 | 0.255 | 0.584 | closest: portable (0.31) |
| 192 | ✗ | L | politeness | rude ↔ courteous | 1.000 | 0.066 | 0.237 | 0.583 | AUC 1.00 |
| 193 | · | L | infection | healthy ↔ infected | 1.000 | 0.066 | 0.247 | 0.582 | closest: junkiness (0.45) |
| 194 | · | L | secrecy | open ↔ secret | 1.000 | 0.066 | 0.211 | 0.582 | closest: openness (0.62) |
| 195 | ✗ | L | heat_level | icy ↔ scalding | 1.000 | 0.066 | 0.207 | 0.581 | AUC 1.00 |
| 196 | · | L | reliability | unreliable ↔ reliable | 0.862 | 0.070 | 0.290 | 0.580 | closest: neglect (0.40) |
| 197 | · | L | junk | nutritious ↔ junk | 1.000 | 0.066 | 0.240 | 0.578 | closest: junkiness (0.71) |
| 198 | · | B | seriousness | playful ↔ serious | 1.000 | 0.066 | 0.242 | 0.577 | closest: fragrance (0.26) |
| 199 | ✗ | L | frontness | rear ↔ front | 0.969 | 0.066 | 0.279 | 0.575 | AUC 0.97 |
| 200 | ✗ | L | wholeness | broken ↔ whole | 1.000 | 0.065 | 0.267 | 0.574 | AUC 1.00 |
| 201 | ✗ | L | wildness | tame ↔ wild | 1.000 | 0.065 | 0.310 | 0.572 | AUC 1.00 |
| 202 | · | L | ornament | unadorned ↔ decorated | 1.000 | 0.065 | 0.265 | 0.571 | closest: composure (0.25) |
| 203 | ✗ | L | ethics | wicked ↔ virtuous | 1.000 | 0.065 | 0.278 | 0.571 | AUC 1.00 |
| 204 | ✗ | H | wild | tame ↔ wild | 1.000 | 0.065 | 0.310 | 0.571 | AUC 1.00 |
| 205 | ✗ | L | contrast | washed ↔ contrasty | 1.000 | 0.065 | 0.265 | 0.571 | AUC 1.00 |
| 206 | ✗ | L | quietness | silent ↔ deafening | 0.982 | 0.067 | 0.205 | 0.569 | AUC 0.98 |
| 207 | ✗ | B | purity | mixed ↔ pure | 1.000 | 0.066 | 0.229 | 0.569 | AUC 1.00 |
| 208 | · | L | predictability | unpredictable ↔ predictable | 1.000 | 0.065 | 0.277 | 0.569 | closest: pattern (0.40) |
| 209 | ✓ | H | **handmade** | manufactured ↔ handmade | 1.000 | 0.065 | 0.249 | 0.568 | rank 1 |
| 210 | ✗ | L | simplicity_style | fussy ↔ plain | 1.000 | 0.065 | 0.246 | 0.568 | AUC 1.00 |
| 211 | ✓ | L | **fragrance** | stinky ↔ fragrant | 0.969 | 0.066 | 0.229 | 0.566 | rank 55 |
| 212 | ✓ | L | **composure** | shattered ↔ unbroken | 0.998 | 0.066 | 0.202 | 0.566 | rank 20 |
| 213 | · | L | rotten | wholesome ↔ rotten | 1.000 | 0.066 | 0.210 | 0.566 | closest: rust (0.37) |
| 214 | ✗ | L | bendability | bendy ↔ unbending | 0.951 | 0.067 | 0.232 | 0.565 | AUC 0.95 |
| 215 | ✗ | L | gravity | buoyant ↔ sinking | 0.951 | 0.066 | 0.274 | 0.564 | AUC 0.95 |
| 216 | ✗ | L | saturation | pale ↔ saturated | 1.000 | 0.066 | 0.210 | 0.563 | AUC 1.00 |
| 217 | · | B | width | narrow ↔ wide | 0.996 | 0.065 | 0.237 | 0.562 | closest: growth (0.35) |
| 218 | ✗ | L | motion | stationary ↔ moving | 1.000 | 0.066 | 0.222 | 0.562 | AUC 1.00 |
| 219 | · | L | maturity | immature ↔ mature | 0.996 | 0.066 | 0.220 | 0.561 | closest: seniority (0.34) |
| 220 | ✗ | L | currentness | obsolete ↔ current | 1.000 | 0.065 | 0.318 | 0.561 | AUC 1.00 |
| 221 | ✗ | L | obsolescence | current ↔ obsolete | 1.000 | 0.065 | 0.318 | 0.560 | AUC 1.00 |
| 222 | ✗ | L | smell_intensity | faint ↔ reeky | 1.000 | 0.065 | 0.282 | 0.560 | AUC 1.00 |
| 223 | · | L | jaggedness | smooth ↔ jagged | 0.998 | 0.066 | 0.209 | 0.558 | closest: softness (0.28) |
| 224 | ✓ | L | **neatness** | slovenly ↔ neat | 0.996 | 0.065 | 0.293 | 0.558 | rank 48 |
| 225 | · | L | smooth_curve | jagged ↔ smooth | 0.998 | 0.066 | 0.209 | 0.557 | closest: softness (0.28) |
| 226 | · | B | taste | bitter ↔ sweet | 1.000 | 0.065 | 0.262 | 0.556 | closest: bitterness (0.48) |
| 227 | ✗ | L | vapor | condensed ↔ vaporous | 1.000 | 0.065 | 0.212 | 0.554 | AUC 1.00 |
| 228 | · | L | barrenness | fertile ↔ barren | 1.000 | 0.065 | 0.225 | 0.552 | closest: growth (0.27) |
| 229 | ✗ | L | emotion_valence | negative ↔ positive | 0.747 | 0.077 | 0.293 | 0.550 | AUC 0.75 |
| 230 | · | L | knowledge | ignorant ↔ knowledgeable | 0.978 | 0.065 | 0.286 | 0.550 | closest: neglect (0.35) |
| 231 | ✓ | L | **dullness** | razor ↔ dull | 1.000 | 0.065 | 0.226 | 0.550 | rank 13 |
| 232 | · | L | binding | unbound ↔ bound | 1.000 | 0.065 | 0.252 | 0.550 | closest: openness (0.25) |
| 233 | · | L | cutting | dull ↔ razor | 1.000 | 0.065 | 0.226 | 0.549 | closest: dullness (1.00) |
| 234 | · | L | spikiness | smooth ↔ spiky | 1.000 | 0.065 | 0.231 | 0.547 | closest: sharpness_point (0.47) |
| 235 | · | L | abundance | scarce ↔ abundant | 1.000 | 0.065 | 0.212 | 0.547 | closest: height (0.33) |
| 236 | · | H | fragility | sturdy ↔ fragile | 1.000 | 0.065 | 0.289 | 0.546 | closest: confidence (0.26) |
| 237 | ✗ | L | sea_state | choppy ↔ placid | 1.000 | 0.065 | 0.247 | 0.546 | AUC 1.00 |
| 238 | · | L | violence_level | nonviolent ↔ violent | 0.947 | 0.066 | 0.217 | 0.543 | closest: crime (0.23) |
| 239 | · | L | energy | sleepy ↔ energetic | 1.000 | 0.065 | 0.268 | 0.541 | closest: alertness (0.26) |
| 240 | ✗ | L | protection | unprotected ↔ protected | 0.987 | 0.065 | 0.275 | 0.539 | AUC 0.99 |
| 241 | ✗ | L | freedom_level | captive ↔ unrestrained | 1.000 | 0.065 | 0.198 | 0.539 | AUC 1.00 |
| 242 | · | B | cleanliness | dirty ↔ clean | 0.933 | 0.066 | 0.261 | 0.536 | closest: neglect (0.25) |
| 243 | · | L | caution | reckless ↔ cautious | 0.973 | 0.065 | 0.225 | 0.534 | closest: sadness (0.23) |
| 244 | · | L | copying | original ↔ copied | 1.000 | 0.065 | 0.251 | 0.534 | closest: growth (0.24) |
| 245 | ✗ | L | completeness | partial ↔ complete | 0.980 | 0.065 | 0.210 | 0.534 | AUC 0.98 |
| 246 | · | L | discipline | undisciplined ↔ disciplined | 0.880 | 0.067 | 0.290 | 0.533 | closest: turbulence (0.33) |
| 247 | ✓ | L | **rust** | pristine ↔ rusty | 1.000 | 0.065 | 0.215 | 0.532 | rank 19 |
| 248 | ✗ | L | spoilage | fresh ↔ spoiled | 1.000 | 0.065 | 0.231 | 0.532 | AUC 1.00 |
| 249 | · | L | clean_modern | rusty ↔ pristine | 1.000 | 0.065 | 0.215 | 0.532 | closest: rust (1.00) |
| 250 | · | L | ringing | dull ↔ ringing | 1.000 | 0.064 | 0.257 | 0.531 | closest: resonant (0.60) |
| 251 | ✗ | L | stability_obj | fragile ↔ robust | 0.998 | 0.065 | 0.194 | 0.531 | AUC 1.00 |
| 252 | · | L | vibration | still ↔ vibrating | 1.000 | 0.065 | 0.180 | 0.531 | closest: flow (0.58) |
| 253 | ✗ | L | fresh_food | spoiled ↔ fresh | 1.000 | 0.065 | 0.231 | 0.531 | AUC 1.00 |
| 254 | ✗ | L | pressure | vacuum ↔ pressurized | 1.000 | 0.065 | 0.168 | 0.526 | AUC 1.00 |
| 255 | · | L | ice | liquid ↔ frozen | 1.000 | 0.065 | 0.211 | 0.525 | closest: gasiness (0.46) |
| 256 | · | B | hardness | soft ↔ hard | 1.000 | 0.064 | 0.258 | 0.524 | closest: tenderness (0.43) |
| 257 | ✓ | L | **flow** | still ↔ flowing | 1.000 | 0.065 | 0.233 | 0.524 | rank 56 |
| 258 | ✗ | B | density | sparse ↔ dense | 0.982 | 0.065 | 0.215 | 0.521 | AUC 0.98 |
| 259 | · | L | sanity | insane ↔ sane | 0.993 | 0.065 | 0.227 | 0.520 | closest: fear (0.23) |
| 260 | · | L | integrity | cracked ↔ intact | 1.000 | 0.064 | 0.240 | 0.520 | closest: rust (0.30) |
| 261 | · | L | creativity | unimaginative ↔ creative | 1.000 | 0.064 | 0.227 | 0.520 | closest: growth (0.27) |
| 262 | · | L | domestication | wild ↔ domestic | 1.000 | 0.064 | 0.222 | 0.518 | closest: cook_level (0.29) |
| 263 | ✓ | B | **value** | cheap ↔ precious | 1.000 | 0.064 | 0.229 | 0.517 | rank 51 |
| 264 | · | L | conformity | nonconforming ↔ conforming | 0.884 | 0.066 | 0.282 | 0.517 | closest: similarity (0.34) |
| 265 | · | L | respectability | shameful ↔ respectable | 0.947 | 0.065 | 0.241 | 0.517 | closest: confidence (0.25) |
| 266 | · | L | despair | hopeful ↔ hopeless | 0.973 | 0.065 | 0.260 | 0.514 | closest: junkiness (0.31) |
| 267 | · | L | carefulness | careless ↔ careful | 1.000 | 0.064 | 0.239 | 0.514 | closest: neglect (0.34) |
| 268 | · | L | hope | hopeless ↔ hopeful | 0.973 | 0.065 | 0.260 | 0.513 | closest: junkiness (0.31) |
| 269 | · | L | toughness | tender ↔ tough | 1.000 | 0.064 | 0.239 | 0.513 | closest: tenderness (1.00) |
| 270 | ✓ | L | **tenderness** | tough ↔ tender | 1.000 | 0.064 | 0.239 | 0.512 | rank 70 |
| 271 | · | L | tangibility | intangible ↔ tangible | 0.991 | 0.064 | 0.290 | 0.512 | closest: silence (0.29) |
| 272 | ✓ | B | **fear** | comforting ↔ scary | 1.000 | 0.064 | 0.215 | 0.511 | rank 54 |
| 273 | · | L | wear | unused ↔ worn | 1.000 | 0.064 | 0.267 | 0.510 | closest: pattern (0.35) |
| 274 | · | L | leniency | strict ↔ lenient | 1.000 | 0.064 | 0.197 | 0.507 | closest: fear (0.26) |
| 275 | · | L | experience | inexperienced ↔ experienced | 0.951 | 0.065 | 0.235 | 0.507 | closest: seniority (0.30) |
| 276 | ✓ | L | **honesty_tone** | deceptive ↔ candid | 1.000 | 0.064 | 0.217 | 0.507 | rank 3 |
| 277 | · | L | strictness | lenient ↔ strict | 1.000 | 0.064 | 0.197 | 0.507 | closest: fear (0.26) |
| 278 | · | L | permissiveness | strict ↔ permissive | 1.000 | 0.064 | 0.242 | 0.505 | closest: openness (0.30) |
| 279 | · | L | spirituality | physical ↔ spiritual | 1.000 | 0.064 | 0.234 | 0.505 | closest: mystery (0.25) |
| 280 | ✗ | L | sourness | sweet ↔ sour | 0.996 | 0.064 | 0.248 | 0.505 | AUC 1.00 |
| 281 | · | L | strictness_rule | permissive ↔ strict | 1.000 | 0.064 | 0.242 | 0.505 | closest: openness (0.30) |
| 282 | · | L | clean_water | murky ↔ sparkling | 1.000 | 0.064 | 0.279 | 0.505 | closest: glare (0.52) |
| 283 | · | L | physicality | spiritual ↔ physical | 1.000 | 0.064 | 0.234 | 0.504 | closest: mystery (0.25) |
| 284 | ✗ | L | ownership | rented ↔ owned | 1.000 | 0.064 | 0.223 | 0.504 | AUC 1.00 |
| 285 | ✗ | H | alive | inanimate ↔ alive | 0.991 | 0.064 | 0.203 | 0.503 | AUC 0.99 |
| 286 | · | L | constraint_level | unregulated ↔ regulated | 0.938 | 0.065 | 0.277 | 0.503 | closest: lock (0.26) |
| 287 | ✓ | L | **volume_sound** | whispering ↔ shouting | 0.991 | 0.064 | 0.240 | 0.502 | rank 73 |
| 288 | · | L | clarity_text | unclear ↔ clear | 0.991 | 0.064 | 0.240 | 0.501 | closest: clarity_mind (0.30) |
| 289 | · | L | agitation | calm ↔ agitated | 0.942 | 0.065 | 0.270 | 0.501 | closest: tempo (0.26) |
| 290 | · | L | diameter | small ↔ large | 0.944 | 0.065 | 0.249 | 0.501 | closest: height (0.38) |
| 291 | ✓ | L | **followership** | leader ↔ follower | 0.933 | 0.065 | 0.273 | 0.497 | rank 39 |
| 292 | ✗ | L | leadership | follower ↔ leader | 0.933 | 0.065 | 0.273 | 0.496 | AUC 0.93 |
| 293 | · | L | rotation | still ↔ spinning | 1.000 | 0.064 | 0.231 | 0.495 | closest: flow (0.58) |
| 294 | · | L | talkativeness | taciturn ↔ talkative | 1.000 | 0.063 | 0.284 | 0.495 | closest: silence (0.53) |
| 295 | · | L | constraint | unrestricted ↔ constrained | 0.996 | 0.064 | 0.240 | 0.494 | closest: growth (0.29) |
| 296 | · | L | openness_mind | closed ↔ open | 0.998 | 0.064 | 0.191 | 0.493 | closest: openness (0.46) |
| 297 | ✗ | L | durability | fragile ↔ durable | 0.998 | 0.063 | 0.267 | 0.489 | AUC 1.00 |
| 298 | ✗ | L | satiety | hungry ↔ sated | 0.982 | 0.064 | 0.200 | 0.488 | AUC 0.98 |
| 299 | ✓ | L | **bitterness** | mild ↔ bitter | 1.000 | 0.064 | 0.182 | 0.488 | rank 23 |
| 300 | ✗ | L | hunger | sated ↔ hungry | 0.982 | 0.064 | 0.200 | 0.487 | AUC 0.98 |
| 301 | ✗ | L | proximity | remote ↔ adjacent | 1.000 | 0.063 | 0.251 | 0.487 | AUC 1.00 |
| 302 | · | L | haze | clear ↔ misty | 0.996 | 0.064 | 0.220 | 0.486 | closest: coverage (0.27) |
| 303 | ✓ | L | **curvature** | straight ↔ curved | 1.000 | 0.064 | 0.167 | 0.485 | rank 38 |
| 304 | · | H | permanence | temporary ↔ permanent | 0.873 | 0.066 | 0.272 | 0.485 | closest: authority (0.30) |
| 305 | · | L | arousal | calm ↔ aroused | 1.000 | 0.063 | 0.246 | 0.485 | closest: dullness (0.24) |
| 306 | · | L | luxury | austere ↔ luxurious | 1.000 | 0.064 | 0.209 | 0.485 | closest: sadness (0.21) |
| 307 | ✗ | L | genuineness | phony ↔ genuine | 1.000 | 0.063 | 0.250 | 0.484 | AUC 1.00 |
| 308 | · | L | reality | imaginary ↔ real | 0.996 | 0.064 | 0.220 | 0.483 | closest: growth (0.25) |
| 309 | ✗ | L | simplicity | complex ↔ simple | 0.964 | 0.064 | 0.259 | 0.481 | AUC 0.96 |
| 310 | · | B | complexity | simple ↔ complex | 0.964 | 0.064 | 0.259 | 0.481 | closest: count (0.29) |
| 311 | · | B | spiciness | mild ↔ spicy | 1.000 | 0.063 | 0.218 | 0.479 | closest: bitterness (0.66) |
| 312 | ✗ | L | breadth | limited ↔ broad | 1.000 | 0.064 | 0.196 | 0.479 | AUC 1.00 |
| 313 | · | L | regularity | irregular ↔ regular | 0.996 | 0.063 | 0.263 | 0.479 | closest: periodicity (0.50) |
| 314 | ✓ | L | **cook_level** | raw ↔ cooked | 1.000 | 0.063 | 0.215 | 0.479 | rank 15 |
| 315 | · | L | reflectance | nonreflective ↔ reflective | 0.936 | 0.064 | 0.324 | 0.477 | closest: silence (0.27) |
| 316 | · | L | sparkly | matte ↔ sparkly | 1.000 | 0.063 | 0.221 | 0.477 | closest: glare (0.29) |
| 317 | · | L | abstractness | concrete ↔ abstract | 1.000 | 0.063 | 0.250 | 0.474 | closest: concreteness (1.00) |
| 318 | · | H | emotion | sad ↔ joyful | 1.000 | 0.063 | 0.246 | 0.474 | closest: sadness (0.56) |
| 319 | ✓ | B | **concreteness** | abstract ↔ concrete | 1.000 | 0.063 | 0.250 | 0.473 | rank 62 |
| 320 | ✗ | L | fiction | real ↔ fictional | 0.962 | 0.064 | 0.247 | 0.473 | AUC 0.96 |
| 321 | ✗ | L | odor | odorless ↔ pungent | 1.000 | 0.063 | 0.231 | 0.473 | AUC 1.00 |
| 322 | ✗ | H | smelliness | odorless ↔ pungent | 1.000 | 0.063 | 0.231 | 0.472 | AUC 1.00 |
| 323 | · | L | certainty_level | uncertain ↔ certain | 0.987 | 0.063 | 0.234 | 0.472 | closest: certainty (0.69) |
| 324 | · | L | repair | damaged ↔ repaired | 0.893 | 0.066 | 0.200 | 0.472 | closest: neglect (0.25) |
| 325 | ✗ | B | colorfulness | gray ↔ colorful | 1.000 | 0.064 | 0.181 | 0.471 | AUC 1.00 |
| 326 | ✗ | L | edge_quality | blunt ↔ keen | 1.000 | 0.063 | 0.276 | 0.470 | AUC 1.00 |
| 327 | · | L | mood | gloomy ↔ cheerful | 1.000 | 0.063 | 0.212 | 0.470 | closest: sadness (0.50) |
| 328 | ✓ | L | **glare** | dusky ↔ dazzling | 1.000 | 0.062 | 0.289 | 0.468 | rank 29 |
| 329 | · | L | length | short ↔ endless | 1.000 | 0.063 | 0.234 | 0.467 | closest: height (0.49) |
| 330 | · | L | guardedness | open ↔ guarded | 0.996 | 0.063 | 0.215 | 0.466 | closest: openness (0.56) |
| 331 | · | L | openness_social | guarded ↔ open | 0.996 | 0.063 | 0.215 | 0.465 | closest: openness (0.56) |
| 332 | ✗ | B | loudness | silent ↔ loud | 0.978 | 0.064 | 0.212 | 0.465 | AUC 0.98 |
| 333 | · | H | era_past | future ↔ past | 0.964 | 0.064 | 0.236 | 0.464 | closest: newness (0.36) |
| 334 | · | L | humility | arrogant ↔ humble | 0.998 | 0.063 | 0.201 | 0.461 | closest: pride (0.50) |
| 335 | · | L | war | peaceful ↔ warlike | 1.000 | 0.063 | 0.218 | 0.461 | closest: tenderness (0.18) |
| 336 | · | L | peace | warlike ↔ peaceful | 1.000 | 0.063 | 0.218 | 0.460 | closest: tenderness (0.18) |
| 337 | ✗ | L | sterility | germy ↔ sterile | 0.964 | 0.064 | 0.234 | 0.459 | AUC 0.96 |
| 338 | · | L | scarcity | plentiful ↔ scarce | 1.000 | 0.063 | 0.241 | 0.459 | closest: height (0.28) |
| 339 | · | B | clarity | vague ↔ clear | 1.000 | 0.063 | 0.251 | 0.458 | closest: crystal (0.39) |
| 340 | ✗ | L | shape_point | rounded ↔ pointy | 1.000 | 0.063 | 0.229 | 0.457 | AUC 1.00 |
| 341 | ✗ | H | freedom | bound ↔ free | 1.000 | 0.063 | 0.247 | 0.456 | AUC 1.00 |
| 342 | ✓ | L | **locality** | global ↔ local | 0.998 | 0.062 | 0.261 | 0.453 | rank 22 |
| 343 | · | L | fickleness | steadfast ↔ fickle | 1.000 | 0.063 | 0.204 | 0.453 | closest: coverage (0.27) |
| 344 | · | L | reach | local ↔ global | 0.998 | 0.062 | 0.261 | 0.453 | closest: locality (1.00) |
| 345 | · | L | steadfastness | fickle ↔ steadfast | 1.000 | 0.063 | 0.204 | 0.452 | closest: coverage (0.27) |
| 346 | ✗ | L | shape_edge | edgeless ↔ edgy | 1.000 | 0.063 | 0.234 | 0.451 | AUC 1.00 |
| 347 | · | L | uniqueness_obj | duplicate ↔ unique | 0.993 | 0.062 | 0.268 | 0.451 | closest: count (0.26) |
| 348 | ✗ | L | trust | suspicious ↔ trusting | 0.982 | 0.063 | 0.235 | 0.450 | AUC 0.98 |
| 349 | ✗ | B | activity | still ↔ moving | 1.000 | 0.063 | 0.208 | 0.449 | AUC 1.00 |
| 350 | ✓ | L | **tempo** | leisurely ↔ hurried | 1.000 | 0.062 | 0.254 | 0.449 | rank 59 |
| 351 | ✗ | L | rest | fatigued ↔ rested | 1.000 | 0.062 | 0.263 | 0.447 | AUC 1.00 |
| 352 | ✓ | L | **crystal** | amorphous ↔ crystalline | 1.000 | 0.062 | 0.260 | 0.447 | rank 35 |
| 353 | · | L | verticality | downward ↔ upward | 0.898 | 0.065 | 0.230 | 0.446 | closest: bravery (0.32) |
| 354 | ✓ | L | **fatigue** | rested ↔ fatigued | 1.000 | 0.062 | 0.263 | 0.446 | rank 42 |
| 355 | ✗ | L | payment | indebted ↔ paid | 1.000 | 0.062 | 0.243 | 0.446 | AUC 1.00 |
| 356 | · | L | excess | moderate ↔ excessive | 1.000 | 0.063 | 0.211 | 0.446 | closest: bitterness (0.34) |
| 357 | ✓ | L | **openness** | sealed ↔ open | 0.987 | 0.063 | 0.221 | 0.446 | rank 7 |
| 358 | ✗ | L | debt | paid ↔ indebted | 1.000 | 0.062 | 0.243 | 0.445 | AUC 1.00 |
| 359 | · | L | temperance | excessive ↔ moderate | 1.000 | 0.063 | 0.211 | 0.445 | closest: bitterness (0.34) |
| 360 | ✗ | L | extent | partial ↔ total | 1.000 | 0.063 | 0.217 | 0.444 | AUC 1.00 |
| 361 | · | L | sparkle | dull ↔ sparkly | 1.000 | 0.062 | 0.244 | 0.442 | closest: dullness (0.52) |
| 362 | ✗ | L | transparency_social | secretive ↔ transparent | 1.000 | 0.062 | 0.221 | 0.442 | AUC 1.00 |
| 363 | ✗ | L | edge | dull ↔ keen | 1.000 | 0.062 | 0.234 | 0.441 | AUC 1.00 |
| 364 | ✗ | L | sogginess | crisp ↔ soggy | 0.942 | 0.063 | 0.240 | 0.440 | AUC 0.94 |
| 365 | ✗ | L | animate | inanimate ↔ animate | 0.880 | 0.064 | 0.294 | 0.440 | AUC 0.88 |
| 366 | · | L | crispness | soggy ↔ crisp | 0.942 | 0.063 | 0.240 | 0.439 | closest: crystal (0.39) |
| 367 | ✗ | L | mushiness | crunchy ↔ mushy | 0.996 | 0.062 | 0.254 | 0.438 | AUC 1.00 |
| 368 | · | L | calmness | frantic ↔ calm | 1.000 | 0.062 | 0.204 | 0.437 | closest: tempo (0.30) |
| 369 | ✗ | L | crunch | mushy ↔ crunchy | 0.996 | 0.062 | 0.254 | 0.437 | AUC 1.00 |
| 370 | · | L | fire | unlit ↔ flaming | 0.962 | 0.063 | 0.234 | 0.435 | closest: glare (0.25) |
| 371 | · | L | evaporation | damp ↔ evaporated | 1.000 | 0.062 | 0.187 | 0.433 | closest: contact (0.30) |
| 372 | ✗ | L | chewiness | tender ↔ chewy | 1.000 | 0.063 | 0.171 | 0.433 | AUC 1.00 |
| 373 | · | L | state | solid ↔ liquid | 0.996 | 0.062 | 0.235 | 0.428 | closest: gasiness (0.31) |
| 374 | · | H | solidness | liquid ↔ solid | 0.996 | 0.062 | 0.235 | 0.428 | closest: gasiness (0.31) |
| 375 | ✗ | L | originality | derivative ↔ original | 1.000 | 0.062 | 0.227 | 0.422 | AUC 1.00 |
| 376 | ✓ | L | **silence** | talkative ↔ silent | 1.000 | 0.062 | 0.230 | 0.422 | rank 72 |
| 377 | · | L | wind | windless ↔ windy | 0.960 | 0.063 | 0.211 | 0.422 | closest: silence (0.29) |
| 378 | ✗ | H | organic | synthetic ↔ organic | 0.998 | 0.062 | 0.250 | 0.421 | AUC 1.00 |
| 379 | ✗ | L | visibility_air | foggy ↔ clear | 0.973 | 0.062 | 0.218 | 0.420 | AUC 0.97 |
| 380 | ✗ | L | sharp_point | blunt ↔ pointed | 1.000 | 0.062 | 0.208 | 0.420 | AUC 1.00 |
| 381 | · | L | grain | smooth ↔ grainy | 1.000 | 0.062 | 0.225 | 0.419 | closest: coverage (0.31) |
| 382 | · | L | calm_sea | stormy ↔ calm | 1.000 | 0.062 | 0.230 | 0.419 | closest: weather (0.47) |
| 383 | ✗ | L | concealment | visible ↔ hidden | 0.949 | 0.063 | 0.199 | 0.418 | AUC 0.95 |
| 384 | · | L | waste | thrifty ↔ wasteful | 0.929 | 0.063 | 0.202 | 0.418 | closest: terrain (0.24) |
| 385 | · | L | generality | specific ↔ general | 1.000 | 0.062 | 0.233 | 0.418 | closest: openness (0.31) |
| 386 | · | L | storminess | calm ↔ stormy | 1.000 | 0.062 | 0.230 | 0.418 | closest: weather (0.47) |
| 387 | ✗ | L | visibility_social | hidden ↔ visible | 0.949 | 0.063 | 0.199 | 0.418 | AUC 0.95 |
| 388 | · | L | specificity | general ↔ specific | 1.000 | 0.062 | 0.233 | 0.417 | closest: openness (0.31) |
| 389 | ✗ | H | visible | hidden ↔ visible | 0.949 | 0.063 | 0.199 | 0.417 | AUC 0.95 |
| 390 | · | L | expertise | novice ↔ expert | 1.000 | 0.062 | 0.209 | 0.414 | closest: beginning (0.28) |
| 391 | ✗ | L | puritan | lewd ↔ chaste | 1.000 | 0.062 | 0.186 | 0.412 | AUC 1.00 |
| 392 | ✗ | L | style | tasteless ↔ stylish | 1.000 | 0.062 | 0.206 | 0.411 | AUC 1.00 |
| 393 | ✗ | L | thirst | quenched ↔ thirsty | 0.996 | 0.062 | 0.242 | 0.411 | AUC 1.00 |
| 394 | ✗ | L | wellness | ill ↔ well | 1.000 | 0.062 | 0.186 | 0.410 | AUC 1.00 |
| 395 | · | B | age | ancient ↔ modern | 0.987 | 0.062 | 0.207 | 0.410 | closest: modernity (0.68) |
| 396 | ✗ | L | illness | well ↔ ill | 1.000 | 0.062 | 0.186 | 0.409 | AUC 1.00 |
| 397 | · | B | popularity | obscure ↔ popular | 1.000 | 0.062 | 0.228 | 0.409 | closest: silence (0.23) |
| 398 | ✗ | B | distance | near ↔ far | 0.987 | 0.062 | 0.210 | 0.406 | AUC 0.99 |
| 399 | · | L | strength | frail ↔ sturdy | 1.000 | 0.062 | 0.227 | 0.405 | closest: neglect (0.33) |
| 400 | ✓ | L | **sharpness_point** | blunt ↔ spiky | 1.000 | 0.062 | 0.229 | 0.404 | rank 2 |
| 401 | · | L | mildness | severe ↔ mild | 1.000 | 0.061 | 0.278 | 0.404 | closest: bitterness (0.45) |
| 402 | ✗ | L | timing | early ↔ late | 1.000 | 0.061 | 0.258 | 0.404 | AUC 1.00 |
| 403 | · | L | severity | mild ↔ severe | 1.000 | 0.061 | 0.278 | 0.403 | closest: bitterness (0.45) |
| 404 | ✗ | L | saltiness | unsalted ↔ salty | 0.980 | 0.062 | 0.233 | 0.400 | AUC 0.98 |
| 405 | ✗ | L | centrality | peripheral ↔ central | 0.998 | 0.061 | 0.229 | 0.400 | AUC 1.00 |
| 406 | ✓ | L | **lethality** | benign ↔ lethal | 1.000 | 0.062 | 0.197 | 0.399 | rank 68 |
| 407 | · | L | importance | trivial ↔ important | 1.000 | 0.062 | 0.213 | 0.399 | closest: pride (0.24) |
| 408 | ✓ | L | **confidence** | insecure ↔ confident | 1.000 | 0.061 | 0.248 | 0.399 | rank 63 |
| 409 | ✗ | L | threed | flatness ↔ depthful | 1.000 | 0.061 | 0.209 | 0.397 | AUC 1.00 |
| 410 | ✗ | L | engagement | detached ↔ engaged | 1.000 | 0.061 | 0.247 | 0.396 | AUC 1.00 |
| 411 | ✗ | L | priority | low ↔ top | 1.000 | 0.061 | 0.216 | 0.395 | AUC 1.00 |
| 412 | · | L | rarity | common ↔ rare | 1.000 | 0.061 | 0.229 | 0.395 | closest: mystery (0.27) |
| 413 | ✗ | L | femininity | masculine ↔ feminine | 0.980 | 0.062 | 0.221 | 0.395 | AUC 0.98 |
| 414 | · | B | frequency | rare ↔ common | 1.000 | 0.061 | 0.229 | 0.394 | closest: mystery (0.27) |
| 415 | ✗ | L | masculinity | feminine ↔ masculine | 0.980 | 0.062 | 0.221 | 0.394 | AUC 0.98 |
| 416 | ✗ | L | gendered | feminine ↔ masculine | 0.980 | 0.062 | 0.221 | 0.393 | AUC 0.98 |
| 417 | · | L | slowness | racing ↔ crawling | 1.000 | 0.061 | 0.238 | 0.392 | closest: speed_motion (1.00) |
| 418 | ✓ | L | **speed_motion** | crawling ↔ racing | 1.000 | 0.061 | 0.238 | 0.391 | rank 74 |
| 419 | ✗ | B | formality | casual ↔ formal | 1.000 | 0.061 | 0.207 | 0.391 | AUC 1.00 |
| 420 | · | B | calm | chaotic ↔ calm | 0.998 | 0.062 | 0.187 | 0.390 | closest: fear (0.27) |
| 421 | ✗ | L | covering | uncovered ↔ covered | 0.991 | 0.061 | 0.222 | 0.388 | AUC 0.99 |
| 422 | ✓ | L | **metallicity** | wooden ↔ metallic | 1.000 | 0.061 | 0.234 | 0.386 | rank 52 |
| 423 | ✗ | L | change | static ↔ changing | 0.987 | 0.061 | 0.217 | 0.386 | AUC 0.99 |
| 424 | ✗ | B | fullness | empty ↔ full | 1.000 | 0.061 | 0.212 | 0.385 | AUC 1.00 |
| 425 | ✗ | L | adulthood | child ↔ adult | 0.909 | 0.063 | 0.224 | 0.384 | AUC 0.91 |
| 426 | ✗ | L | youth | adult ↔ child | 0.909 | 0.063 | 0.224 | 0.383 | AUC 0.91 |
| 427 | ✗ | L | singularity | multiple ↔ single | 0.996 | 0.060 | 0.273 | 0.382 | AUC 1.00 |
| 428 | ✓ | L | **count** | single ↔ multiple | 0.996 | 0.060 | 0.273 | 0.382 | rank 28 |
| 429 | · | L | urgency | optional ↔ urgent | 0.993 | 0.061 | 0.243 | 0.380 | closest: tempo (0.25) |
| 430 | ✓ | L | **certainty** | doubtful ↔ certain | 0.942 | 0.062 | 0.207 | 0.379 | rank 66 |
| 431 | · | L | boldness | timid ↔ bold | 1.000 | 0.061 | 0.205 | 0.379 | closest: bravery (0.27) |
| 432 | ✓ | L | **bravery** | cowardly ↔ brave | 0.869 | 0.064 | 0.219 | 0.378 | rank 61 |
| 433 | · | L | attention | inattentive ↔ attentive | 0.916 | 0.063 | 0.197 | 0.377 | closest: neglect (0.34) |
| 434 | ✗ | L | insideness | outside ↔ inside | 0.931 | 0.062 | 0.245 | 0.376 | AUC 0.93 |
| 435 | · | L | strength_moral | weak ↔ steadfast | 1.000 | 0.061 | 0.180 | 0.376 | closest: neglect (0.27) |
| 436 | ✗ | L | participation | spectator ↔ participant | 0.982 | 0.060 | 0.263 | 0.373 | AUC 0.98 |
| 437 | · | L | strength_body | weak ↔ strong | 0.822 | 0.064 | 0.228 | 0.372 | closest: bravery (0.30) |
| 438 | · | L | noisiness | quiet ↔ noisy | 1.000 | 0.060 | 0.231 | 0.372 | closest: volume_sound (0.27) |
| 439 | ✗ | L | elasticity | inelastic ↔ elastic | 0.987 | 0.061 | 0.240 | 0.371 | AUC 0.99 |
| 440 | ✗ | L | naturalness | synthetic ↔ natural | 0.964 | 0.061 | 0.220 | 0.371 | AUC 0.96 |
| 441 | ✓ | L | **teamwork** | solo ↔ team | 1.000 | 0.060 | 0.244 | 0.370 | rank 21 |
| 442 | · | L | usage | worn ↔ new | 1.000 | 0.061 | 0.193 | 0.369 | closest: newness (0.56) |
| 443 | ✗ | L | competition | cooperative ↔ competitive | 1.000 | 0.060 | 0.237 | 0.366 | AUC 1.00 |
| 444 | · | L | intensity | mild ↔ intense | 1.000 | 0.060 | 0.200 | 0.366 | closest: bitterness (0.50) |
| 445 | · | L | ordinariness | unique ↔ ordinary | 0.922 | 0.062 | 0.196 | 0.365 | closest: newness (0.26) |
| 446 | · | L | pleasure | painful ↔ pleasurable | 1.000 | 0.061 | 0.182 | 0.365 | closest: sadness (0.38) |
| 447 | · | L | uniqueness | ordinary ↔ unique | 0.922 | 0.062 | 0.196 | 0.364 | closest: newness (0.26) |
| 448 | ✗ | L | planarity | curved ↔ planar | 0.967 | 0.061 | 0.206 | 0.364 | AUC 0.97 |
| 449 | ✓ | L | **tone** | monotone ↔ sonorous | 1.000 | 0.060 | 0.216 | 0.363 | rank 12 |
| 450 | ✓ | H | **portable** | immovable ↔ portable | 1.000 | 0.059 | 0.271 | 0.362 | rank 34 |
| 451 | ✗ | L | shine | matte ↔ glossy | 0.929 | 0.062 | 0.213 | 0.360 | AUC 0.93 |
| 452 | · | L | extroversion | introverted ↔ extroverted | 0.889 | 0.062 | 0.266 | 0.358 | closest: silence (0.30) |
| 453 | · | L | hollowness | solid ↔ hollow | 0.996 | 0.061 | 0.181 | 0.357 | closest: curvature (0.28) |
| 454 | ✗ | L | sexuality | asexual ↔ sexual | 0.964 | 0.061 | 0.196 | 0.357 | AUC 0.96 |
| 455 | · | L | solidity | hollow ↔ solid | 0.996 | 0.061 | 0.181 | 0.356 | closest: curvature (0.28) |
| 456 | ✓ | L | **sadness** | joyful ↔ mournful | 1.000 | 0.060 | 0.187 | 0.354 | rank 60 |
| 457 | · | L | radicalism | conservative ↔ radical | 1.000 | 0.060 | 0.199 | 0.352 | closest: fear (0.21) |
| 458 | · | L | friction | frictionless ↔ abrasive | 0.893 | 0.062 | 0.249 | 0.352 | closest: bitterness (0.28) |
| 459 | ✗ | L | conservatism | radical ↔ conservative | 1.000 | 0.060 | 0.199 | 0.352 | AUC 1.00 |
| 460 | · | H | sharpness | dull ↔ sharp | 1.000 | 0.059 | 0.237 | 0.351 | closest: dullness (0.60) |
| 461 | · | L | sickness | healthy ↔ sick | 1.000 | 0.059 | 0.211 | 0.349 | closest: junkiness (0.57) |
| 462 | ✗ | L | mass | weightless ↔ massive | 1.000 | 0.059 | 0.213 | 0.349 | AUC 1.00 |
| 463 | · | L | health | sick ↔ healthy | 1.000 | 0.059 | 0.211 | 0.349 | closest: junkiness (0.57) |
| 464 | ✓ | L | **exposure** | shielded ↔ exposed | 0.996 | 0.059 | 0.251 | 0.346 | rank 46 |
| 465 | · | L | shielding | exposed ↔ shielded | 0.996 | 0.059 | 0.251 | 0.345 | closest: exposure (1.00) |
| 466 | · | L | inflate | deflated ↔ inflated | 0.964 | 0.060 | 0.224 | 0.343 | closest: height (0.24) |
| 467 | · | L | stimulation | boring ↔ exciting | 1.000 | 0.059 | 0.225 | 0.341 | closest: dullness (0.36) |
| 468 | ✓ | L | **modernity** | antique ↔ modern | 0.989 | 0.060 | 0.175 | 0.340 | rank 50 |
| 469 | · | B | brightness | dark ↔ bright | 0.918 | 0.061 | 0.238 | 0.340 | closest: glare (0.39) |
| 470 | ✓ | L | **clarity_mind** | confused ↔ lucid | 1.000 | 0.060 | 0.169 | 0.338 | rank 31 |
| 471 | · | L | heaviness | lightweight ↔ overweight | 0.913 | 0.062 | 0.215 | 0.337 | closest: clarity_mind (0.30) |
| 472 | · | L | luster | dull ↔ lustrous | 1.000 | 0.059 | 0.209 | 0.337 | closest: dullness (0.43) |
| 473 | · | L | visibility_obj | invisible ↔ visible | 0.991 | 0.060 | 0.180 | 0.335 | closest: mystery (0.34) |
| 474 | ✗ | L | tightness | loose ↔ tight | 0.907 | 0.062 | 0.234 | 0.335 | AUC 0.91 |
| 475 | ✗ | L | moisture | parched ↔ sodden | 0.998 | 0.059 | 0.184 | 0.333 | AUC 1.00 |
| 476 | ✗ | L | sweetwater | saline ↔ freshwater | 0.960 | 0.060 | 0.200 | 0.332 | AUC 0.96 |
| 477 | ✗ | L | salinity | freshwater ↔ saline | 0.960 | 0.060 | 0.200 | 0.331 | AUC 0.96 |
| 478 | · | L | soak | dry ↔ soaked | 0.991 | 0.059 | 0.221 | 0.331 | closest: wetness (0.64) |
| 479 | · | L | charring | unburned ↔ burnt | 0.802 | 0.064 | 0.216 | 0.331 | closest: composure (0.29) |
| 480 | ✗ | B | weight | light ↔ heavy | 1.000 | 0.059 | 0.220 | 0.330 | AUC 1.00 |
| 481 | ✗ | L | authenticity | fake ↔ genuine | 0.936 | 0.061 | 0.204 | 0.325 | AUC 0.94 |
| 482 | · | L | cloudiness | cloudless ↔ cloudy | 0.960 | 0.060 | 0.207 | 0.324 | closest: composure (0.24) |
| 483 | · | L | sociality | solitary ↔ social | 1.000 | 0.059 | 0.186 | 0.324 | closest: teamwork (0.25) |
| 484 | · | L | temperature_outside | frigid ↔ sweltering | 0.998 | 0.059 | 0.210 | 0.324 | closest: softness (0.26) |
| 485 | ✗ | H | social | solitary ↔ social | 1.000 | 0.059 | 0.186 | 0.324 | AUC 1.00 |
| 486 | ✗ | L | elevation | valley ↔ summit | 1.000 | 0.058 | 0.236 | 0.323 | AUC 1.00 |
| 487 | ✓ | L | **periodicity** | irregular ↔ periodic | 1.000 | 0.059 | 0.205 | 0.323 | rank 11 |
| 488 | · | L | damage | undamaged ↔ damaged | 0.967 | 0.060 | 0.206 | 0.322 | closest: composure (0.40) |
| 489 | ✗ | L | viscosity | watery ↔ syrupy | 1.000 | 0.059 | 0.185 | 0.322 | AUC 1.00 |
| 490 | ✓ | L | **seniority** | senior ↔ junior | 1.000 | 0.059 | 0.177 | 0.318 | rank 27 |
| 491 | · | L | cost | cheap ↔ expensive | 0.969 | 0.059 | 0.252 | 0.318 | closest: value (0.47) |
| 492 | ✓ | L | **newness** | old ↔ new | 0.951 | 0.060 | 0.225 | 0.317 | rank 18 |
| 493 | · | L | rank | junior ↔ senior | 1.000 | 0.059 | 0.177 | 0.317 | closest: seniority (1.00) |
| 494 | · | H | recency | old ↔ new | 0.951 | 0.060 | 0.225 | 0.317 | closest: newness (1.00) |
| 495 | ✗ | L | containment | external ↔ internal | 0.891 | 0.061 | 0.265 | 0.317 | AUC 0.89 |
| 496 | ✗ | L | season | winter ↔ summer | 1.000 | 0.057 | 0.227 | 0.316 | AUC 1.00 |
| 497 | ✗ | L | slickness | grippy ↔ slippery | 0.882 | 0.062 | 0.229 | 0.313 | AUC 0.88 |
| 498 | ✗ | L | accuracy | inexact ↔ accurate | 0.982 | 0.058 | 0.236 | 0.311 | AUC 0.98 |
| 499 | ✓ | L | **urbanity** | rural ↔ urban | 0.996 | 0.056 | 0.265 | 0.308 | rank 9 |
| 500 | · | L | rurality | urban ↔ rural | 0.996 | 0.056 | 0.265 | 0.307 | closest: urbanity (1.00) |
| 501 | ✓ | B | **wetness** | dry ↔ wet | 0.969 | 0.058 | 0.257 | 0.307 | rank 16 |
| 502 | · | H | domestic | foreign ↔ domestic | 1.000 | 0.058 | 0.173 | 0.307 | closest: locality (0.27) |
| 503 | · | H | urban | rural ↔ urban | 0.996 | 0.056 | 0.265 | 0.306 | closest: urbanity (1.00) |
| 504 | · | L | scope | narrow ↔ broad | 0.933 | 0.060 | 0.206 | 0.305 | closest: growth (0.31) |
| 505 | ✓ | L | **weather** | sunny ↔ stormy | 0.960 | 0.059 | 0.192 | 0.305 | rank 8 |
| 506 | · | B | intelligence | dumb ↔ brilliant | 1.000 | 0.057 | 0.222 | 0.300 | closest: glare (0.27) |
| 507 | ✓ | L | **authority** | subordinate ↔ dominant | 0.998 | 0.058 | 0.182 | 0.300 | rank 37 |
| 508 | ✗ | B | speed | slow ↔ fast | 0.951 | 0.058 | 0.250 | 0.299 | AUC 0.95 |
| 509 | · | L | freshness | stale ↔ fresh | 1.000 | 0.057 | 0.190 | 0.297 | closest: growth (0.32) |
| 510 | ✗ | L | direction | left ↔ right | 0.956 | 0.058 | 0.264 | 0.296 | AUC 0.96 |
| 511 | ✗ | L | temperature_body | chilled ↔ overheated | 1.000 | 0.057 | 0.193 | 0.296 | AUC 1.00 |
| 512 | ✗ | L | directness | indirect ↔ direct | 0.942 | 0.059 | 0.208 | 0.295 | AUC 0.94 |
| 513 | ✓ | L | **lock** | unlocked ↔ locked | 0.902 | 0.060 | 0.231 | 0.295 | rank 33 |
| 514 | ✗ | L | credulity | skeptical ↔ gullible | 0.887 | 0.061 | 0.243 | 0.294 | AUC 0.89 |
| 515 | ✗ | L | skepticism | gullible ↔ skeptical | 0.887 | 0.061 | 0.243 | 0.293 | AUC 0.89 |
| 516 | ✗ | L | granularity | powdery ↔ chunky | 0.984 | 0.058 | 0.180 | 0.292 | AUC 0.98 |
| 517 | · | L | burn_state | unburned ↔ charred | 0.878 | 0.061 | 0.210 | 0.291 | closest: composure (0.27) |
| 518 | · | L | novelty | familiar ↔ novel | 1.000 | 0.056 | 0.197 | 0.289 | closest: newness (0.25) |
| 519 | ✗ | L | slope | flatland ↔ hillside | 0.993 | 0.056 | 0.210 | 0.288 | AUC 0.99 |
| 520 | ✓ | L | **waterness** | desert ↔ ocean | 1.000 | 0.057 | 0.157 | 0.285 | rank 30 |
| 521 | · | L | precision | approximate ↔ precise | 1.000 | 0.057 | 0.175 | 0.285 | closest: crystal (0.25) |
| 522 | · | L | rain | dry ↔ rainy | 1.000 | 0.056 | 0.194 | 0.284 | closest: wetness (0.61) |
| 523 | ✗ | L | visibility | opaque ↔ clear | 0.902 | 0.060 | 0.210 | 0.281 | AUC 0.90 |
| 524 | ✓ | L | **charity** | selfish ↔ charitable | 0.947 | 0.059 | 0.188 | 0.281 | rank 32 |
| 525 | ✗ | L | pitch | bass ↔ treble | 0.996 | 0.056 | 0.186 | 0.276 | AUC 1.00 |
| 526 | ✓ | H | **mystery** | obvious ↔ mysterious | 1.000 | 0.054 | 0.207 | 0.276 | rank 58 |
| 527 | · | L | tradition | modern ↔ traditional | 0.991 | 0.055 | 0.198 | 0.275 | closest: modernity (0.44) |
| 528 | · | L | intoxication | sober ↔ drunk | 0.933 | 0.058 | 0.231 | 0.273 | closest: wetness (0.25) |
| 529 | ✗ | L | stickiness | nonstick ↔ sticky | 0.980 | 0.057 | 0.175 | 0.273 | AUC 0.98 |
| 530 | ✓ | L | **pride** | humble ↔ proud | 0.982 | 0.056 | 0.211 | 0.273 | rank 67 |
| 531 | ✗ | L | sobriety | drunk ↔ sober | 0.933 | 0.058 | 0.231 | 0.272 | AUC 0.93 |
| 532 | ✗ | B | temperature | freezing ↔ burning | 0.991 | 0.055 | 0.205 | 0.272 | AUC 0.99 |
| 533 | · | L | order_rank | last ↔ first | 0.898 | 0.059 | 0.228 | 0.271 | closest: beginning (0.38) |
| 534 | · | L | sequence | first ↔ last | 0.898 | 0.059 | 0.228 | 0.270 | closest: beginning (0.38) |
| 535 | · | L | melting | frozen ↔ molten | 0.938 | 0.059 | 0.192 | 0.269 | closest: metallicity (0.24) |
| 536 | ✗ | L | pain | painless ↔ painful | 0.951 | 0.057 | 0.220 | 0.263 | AUC 0.95 |
| 537 | ✗ | L | location | distant ↔ nearby | 0.893 | 0.059 | 0.219 | 0.262 | AUC 0.89 |
| 538 | ✗ | L | quantity | few ↔ many | 0.973 | 0.053 | 0.207 | 0.253 | AUC 0.97 |
| 539 | ✗ | L | outdoors | indoor ↔ outdoor | 0.889 | 0.058 | 0.260 | 0.251 | AUC 0.89 |
| 540 | · | L | indoors | outdoor ↔ indoor | 0.889 | 0.058 | 0.260 | 0.250 | closest: exposure (0.19) |
| 541 | ✓ | B | **height** | short ↔ tall | 0.960 | 0.056 | 0.190 | 0.249 | rank 64 |
| 542 | ✗ | L | toxicity | harmless ↔ poisonous | 0.924 | 0.057 | 0.216 | 0.249 | AUC 0.92 |
| 543 | ✗ | H | indoor | outdoor ↔ indoor | 0.889 | 0.058 | 0.260 | 0.249 | AUC 0.89 |
| 544 | · | L | understanding | understandable ↔ incomprehensible | 0.911 | 0.057 | 0.235 | 0.247 | closest: portable (0.23) |
| 545 | · | L | comprehension | incomprehensible ↔ understandable | 0.911 | 0.057 | 0.235 | 0.246 | closest: portable (0.23) |
| 546 | ✗ | L | artificiality | natural ↔ artificial | 0.947 | 0.057 | 0.175 | 0.245 | AUC 0.95 |
| 547 | ✗ | H | natural | artificial ↔ natural | 0.947 | 0.057 | 0.175 | 0.245 | AUC 0.95 |
| 548 | ✓ | L | **gasiness** | liquid ↔ gaseous | 0.933 | 0.058 | 0.168 | 0.244 | rank 47 |
| 549 | · | L | immediacy | eventual ↔ immediate | 0.987 | 0.050 | 0.145 | 0.241 | closest: mystery (0.24) |
| 550 | ✗ | B | symmetry | asymmetric ↔ symmetric | 0.958 | 0.055 | 0.195 | 0.241 | AUC 0.96 |
| 551 | · | L | distance_time | immediate ↔ eventual | 0.987 | 0.050 | 0.145 | 0.240 | closest: mystery (0.24) |
| 552 | ✗ | B | depth | shallow ↔ deep | 0.942 | 0.055 | 0.212 | 0.235 | AUC 0.94 |
| 553 | · | L | difference | similar ↔ different | 0.942 | 0.055 | 0.168 | 0.224 | closest: similarity (1.00) |
| 554 | ✓ | L | **similarity** | different ↔ similar | 0.942 | 0.055 | 0.168 | 0.223 | rank 71 |
| 555 | · | L | fineness | coarse ↔ fine | 0.900 | 0.057 | 0.193 | 0.221 | closest: particle (1.00) |
| 556 | · | L | coarseness | fine ↔ coarse | 0.900 | 0.057 | 0.193 | 0.220 | closest: particle (1.00) |
| 557 | · | L | finish | finished ↔ unfinished | 0.838 | 0.060 | 0.196 | 0.220 | closest: coverage (0.25) |
| 558 | ✓ | L | **particle** | fine ↔ coarse | 0.900 | 0.057 | 0.193 | 0.219 | rank 69 |
| 559 | · | L | completion | unfinished ↔ finished | 0.838 | 0.060 | 0.196 | 0.219 | closest: coverage (0.25) |
| 560 | ✓ | L | **beginning** | ending ↔ beginning | 0.933 | 0.052 | 0.197 | 0.217 | rank 4 |
| 561 | ✗ | L | daytime | night ↔ day | 0.842 | 0.059 | 0.230 | 0.208 | AUC 0.84 |
| 562 | ✗ | L | dampness | dry ↔ damp | 0.936 | 0.055 | 0.151 | 0.207 | AUC 0.94 |
| 563 | ✗ | L | dryness | damp ↔ dry | 0.936 | 0.055 | 0.151 | 0.206 | AUC 0.94 |
| 564 | ✗ | L | weather_dry | droughty ↔ rainy | 0.856 | 0.057 | 0.243 | 0.206 | AUC 0.86 |
| 565 | · | L | privacy | public ↔ private | 0.838 | 0.059 | 0.190 | 0.203 | closest: openness (0.29) |
| 566 | · | H | public | private ↔ public | 0.838 | 0.059 | 0.190 | 0.202 | closest: openness (0.29) |
| 567 | ✗ | L | topology | concave ↔ convex | 0.898 | 0.056 | 0.185 | 0.198 | AUC 0.90 |
| 568 | ✗ | L | doneness | undercooked ↔ overcooked | 0.847 | 0.058 | 0.191 | 0.188 | AUC 0.85 |
| 569 | ✗ | L | thickness | thin ↔ thick | 0.867 | 0.057 | 0.187 | 0.188 | AUC 0.87 |
| 570 | ✗ | L | ending | started ↔ ended | 0.753 | 0.061 | 0.205 | 0.178 | AUC 0.75 |
| 571 | ✗ | L | start | ended ↔ started | 0.753 | 0.061 | 0.205 | 0.177 | AUC 0.75 |
| 572 | ✗ | L | sanction | banned ↔ sanctioned | 0.758 | 0.059 | 0.238 | 0.163 | AUC 0.76 |
| 573 | ✗ | L | itch | nonitchy ↔ itchy | 0.773 | 0.058 | 0.252 | 0.156 | AUC 0.77 |
| 574 | ✗ | L | truth | false ↔ true | 0.853 | 0.055 | 0.181 | 0.156 | AUC 0.85 |
| 575 | ✗ | L | wakefulness | asleep ↔ awake | 0.698 | 0.059 | 0.248 | 0.152 | AUC 0.70 |
| 576 | ✗ | L | sleep | awake ↔ asleep | 0.698 | 0.059 | 0.248 | 0.151 | AUC 0.70 |
| 577 | · | L | guilt | innocent ↔ guilty | 0.822 | 0.056 | 0.203 | 0.150 | closest: rust (0.22) |
| 578 | ✗ | L | innocence | guilty ↔ innocent | 0.822 | 0.056 | 0.203 | 0.150 | AUC 0.82 |
| 579 | ✗ | L | opacity | transparent ↔ opaque | 0.809 | 0.057 | 0.198 | 0.141 | AUC 0.81 |
| 580 | ✗ | B | transparency | opaque ↔ transparent | 0.809 | 0.057 | 0.198 | 0.140 | AUC 0.81 |
| 581 | ✗ | L | audibility | inaudible ↔ audible | 0.724 | 0.058 | 0.207 | 0.116 | AUC 0.72 |
| 582 | ✗ | L | departure | arrived ↔ departed | 0.720 | 0.055 | 0.205 | 0.081 | AUC 0.72 |
| 583 | ✗ | L | arrival | departed ↔ arrived | 0.720 | 0.055 | 0.205 | 0.080 | AUC 0.72 |
| 584 | ✗ | L | sweetness | unsweetened ↔ sugary | 0.749 | 0.054 | 0.202 | 0.074 | AUC 0.75 |

## Accepted axes — bootstrapped test words

Test words are vocab words ranked positions 30-45 closest to each anchor (k-NN bootstrap with held-out top-30). Sanity check for anchor polysemy.

| Axis | Anchors | Test low | Test high |
|------|---------|----------|-----------|
| **handmade** | manufactured ↔ handmade | industrialized, factories, fabricating, commercialized, factory, motorized, makings, formulated | stitched, carved, craftsmen, crafting, embroidered, authentic, knitted, genuine |
| **sharpness_point** | blunt ↔ spiky | overt, ruthlessly, transparently, coldly, dull, outspoken, blanks, pungent | spangled, spurts, spotty, serrated, bristle, spear, spiraling, spate |
| **honesty_tone** | deceptive ↔ candid | misrepresenting, covert, revealing, evasive, tricky, disguise, falsifying, falsified | genuine, tasty, uncensored, curious, cordial, calm, worthy, creamy |
| **beginning** | ending ↔ beginning | done, finalize, concludes, entry, conclusion, heading, terminating, success | opening, baseline, origination, origin, initiates, creation, nascent, originating |
| **temperature_food** | chilled ↔ steaming | cold, warmed, stressed, nonchalant, cryogenic, frigging, cooling, chopped | burning, cooking, frying, spouting, soaking, boilers, stoves, freezing |
| **crime** | lawful ↔ criminal | justice, defensible, legitimacy, allowable, authorised, juris, halal, peaceful | violators, offense, slave, maliciously, perpetrated, offences, violation, convict |
| **openness** | sealed ↔ open | configured, protected, securely, explicit, axed, ordered, sealer, finish | allowed, door, available, public, start, boxed, reopened, opts |
| **weather** | sunny ↔ stormy | sundown, sola, brightened, shade, solano, summers, sunflower, brighten | stormwater, gusty, stony, thunderous, clouded, meteorological, raines, gloomy |
| **urbanity** | rural ↔ urban | prairie, rar, suburb, villages, agro, ranching, farmhouse, countryman | und, area, metropolitan, city, busier, edu, bau, workspace |
| **resonant** | dead ↔ ringing | assed, deathbed, bled, serious, teen, gone, spent, lost | rowling, gong, rustling, chattering, resonating, barking, phoning, pinged |
| **periodicity** | irregular ↔ periodic | idiosyncratic, deviant, offbeat, repeating, abnormality, rectangular, arbitrary, unusually | intermittently, systemic, fortnightly, tidal, oscillating, spectral, punctuated, biennial |
| **tone** | monotone ↔ sonorous | uniformly, monogamous, singly, alternation, flatly, toner, wordless, dichotomy | roaring, sounds, uttering, phonetic, resonates, thunderous, raspy, consonant |
| **dullness** | razor ↔ dull | cutthroat, scissor, sharpest, viper, shaved, scythe, bristle, rake | soulless, uneventful, obtuse, banal, underwhelming, droll, subdued, blankly |
| **contact** | separated ↔ touching | suspended, fragmented, unconnected, subdivided, splitting, alienated, singled, secede | grasping, taking, patting, touchscreen, feel, tangible, feely, stimulating |
| **cook_level** | raw ↔ cooked | mort, reek, solid, wang, rosso, primitive, rab, roz | soup, seasoned, oven, poached, roasted, reheat, compile, chai |
| **wetness** | dry ↔ wet | dur, sink, fine, smooth, driest, inactive, sealed, duce | muddy, hydrated, vivid, muggy, wash, dehydrated, sweated, submerged |
| **flexibility_mind** | dogmatic ↔ flexible | devout, obsessively, rigid, staunchly, orthodoxy, rigidly, insistent, fundamentalist | resilient, easygoing, interchangeable, programmable, disposable, affordable, readily, amenable |
| **newness** | old ↔ new | ages, ald, outdated, ancestor, alt, outmoded, vintage, original | updated, now, updates, latest, unique, emerging, nov, nou |
| **rust** | pristine ↔ rusty | cleansed, freshly, sanitized, virginity, perfection, sanctity, sauber, restored | rushton, junkyard, randy, putrid, ricks, krusty, rundown, rotted |
| **composure** | shattered ↔ unbroken | mutilated, scarred, shaken, disintegrating, smashes, bashed, decimated, trashed | inseparable, unassailable, unspoiled, faultless, heartbroken, unhurt, untold, untenable |
| **teamwork** | solo ↔ team | sits, sino, series, eso, esi, unilateral, oni, sic | crews, organisation, ensemble, staffing, staffers, group, stm, dept |
| **locality** | global ↔ local | international, infinity, internationally, main, xyz, macro, trans, generalized | native, cola, parochial, regions, main, timezone, small, atl |
| **bitterness** | mild ↔ bitter | faint, meek, clement, muted, uncomplicated, harmless, faintest, lenient | sauer, harshest, unhappy, madder, scathing, thorny, biter, nastiest |
| **terrain** | level ↔ mountainous | stage, defined, subsection, classes, class, levelling, ratings, benchmark | mountaineers, uplands, altitudes, mount, hilltop, towering, gravelly, glacial |
| **function** | broken ↔ working | missing, collapsed, heartbroken, branch, buggy, splice, repairing, breakup | remaining, putting, activities, walking, successful, productively, steady, functional |
| **morality** | evil ↔ good | infernal, death, vere, malicious, killer, god, vicious, sith | interesting, worthy, ful, thanks, useful, wel, excellent, fair |
| **seniority** | senior ↔ junior | adult, highschool, elder, nagy, older, emeritus, premium, executive | juju, grandson, july, yun, julien, jonny, intern, youth |
| **count** | single ↔ multiple | standalone, crew, una, else, uni, serie, unique, semi | repeat, combo, million, twenty, multiplying, lots, multivariate, matches |
| **glare** | dusky ↔ dazzling | foggy, dark, dusted, shaded, speckled, pale, obscures, dingy | flamboyant, mesmerizing, glamorous, blinding, marvelous, impressing, shining, splendid |
| **waterness** | desert ↔ ocean | cactus, dubai, prairie, dirt, sands, despair, wilderness, jungles | oriental, beach, olive, olympic, aquarium, octopus, ope, seafood |
| **clarity_mind** | confused ↔ lucid | scared, cluttered, flustered, clarified, addled, misunderstood, disputed, crazy | likud, glib, coherent, luz, clear, clarity, lid, limelight |
| **charity** | selfish ↔ charitable | narcissists, arrogant, sociopathic, wilful, hypocritical, callous, carelessness, irresponsibly | selfless, pious, laudable, hearty, fundraiser, worthwhile, sacrificial, gracious |
| **lock** | unlocked ↔ locked | unloaded, freeing, lock, uncovered, lockup, unhindered, boxed, keyed | deadlock, block, reserved, inactive, latching, retain, lockouts, lok |
| **portable** | immovable ↔ portable | incomparable, insoluble, inoperable, unstoppable, inaccessible, fixed, uninhabitable, inescapable | itinerant, convenient, disposable, transferable, mobiles, expandable, mounted, compact |
| **crystal** | amorphous ↔ crystalline | various, vagueness, indefinite, amoral, incoherent, gelatinous, metaphysical, infinite | faceted, cleavage, diffraction, igneous, prism, grainy, fractal, cryo |
| **junkiness** | healthy ↔ junk | pleasant, ful, nutrition, acceptable, wellness, nourishing, steady, clean | clunky, litters, trashing, bunk, jugs, knackered, salvaged, dingy |
| **authority** | subordinate ↔ dominant | subgroup, supervising, superiors, servant, subclasses, deputies, subsystem, descendants | prominently, supremacy, ruler, possessor, descending, principal, possessing, prominence |
| **curvature** | straight ↔ curved | equal, stripe, perpendicular, inline, right, thin, heterosexual, linearly | deviated, helical, contorted, sloping, scalloped, circled, spiral, sloped |
| **followership** | leader ↔ follower | bearer, testimonial, commend, mates, recognized, boss, operative, arians | disciple, subscribers, friend, liken, favorites, fav, leads, observer |
| **growth** | stunted ↔ grown | derailed, undersized, restrained, suppressed, shorted, discouraged, deterred, hobbled | raising, raises, loom, seeded, develop, bred, generative, gene |
| **conflict** | harmony ↔ conflict | resonates, parity, balance, tranquillity, concordance, happiness, affinity, serenity | hostilities, violence, conspiracy, fight, contra, contending, clashes, contesting |
| **fatigue** | rested ↔ fatigued | arresting, arrest, repossessed, reversed, slowed, regressed, stagnated, repressed | dehydrated, drained, tedious, sleepiness, knackered, bereft, tire, depleted |
| **coverage** | patchy ↔ complete | shadowy, patches, scruffy, grainy, flaking, shaky, choppy, unclear | completions, continuous, streamlined, total, configured, fill, included, finalizing |
| **pattern** | random ↔ patterned | unsigned, unrelated, unlikely, offbeat, duplicate, quirky, quiz, unexplained | stylized, moulded, grained, methodically, numbered, profiled, layered, corrugated |
| **alignment** | askew ↔ aligned | scofield, squint, kean, ashish, aswell, etch, shrew, foresaw | equal, consistent, arrayed, paired, wise, streamlined, based, equally |
| **exposure** | shielded ↔ exposed | bracketed, hedged, insulating, pared, charged, guarded, streamlined, braced | reveals, explored, exhibits, excerpted, humiliated, confronted, exempted, unprotected |
| **gasiness** | liquid ↔ gaseous | fuel, viscous, juice, lox, vaporized, flows, hydro, lod | dioxide, stratospheric, gasping, carbonated, fuming, ghg, radiative, flammable |
| **neatness** | slovenly ↔ neat | sloths, sluggish, filthy, slum, unjust, unequal, unsightly, shabby | nailed, tucked, bonito, knapp, cleanly, geeky, smartly, cool |
| **neglect** | maintained ↔ neglected | remain, cleaned, managing, audited, preserving, retaining, held, persisting | unnoticed, ignoring, overlook, deserted, abandons, abused, orphaned, abandonment |
| **modernity** | antique ↔ modern | quaint, medieval, archival, antebellum, historical, prehistoric, aged, victorian | modal, remodeled, urban, contemporaneous, stylish, newer, today, stylized |
| **value** | cheap ↔ precious | heap, called, competitive, illegal, charge, paid, mall, axed | coveted, sweetly, blessed, beautiful, gemstones, prim, worthy, immaculate |
| **metallicity** | wooden ↔ metallic | board, woodbridge, laminated, woodward, built, forested, pallet, carved | steely, mineral, solid, charged, mercury, materials, smelter, chrome |
| **alertness** | drowsy ↔ alert | slows, lethargy, drugging, sober, benadryl, languid, sleepwalking, doped | call, noticed, signals, bulletins, signal, alarms, inform, debug |
| **fear** | comforting ↔ scary | pacify, pleasing, pleasant, affirming, contented, helpful, conciliatory, nurturing | ghostly, exciting, dangerous, worrisome, frightens, intimidating, frightened, haunting |
| **fragrance** | stinky ↔ fragrant | soiled, staid, smells, stuck, seedy, pissy, dirtiest, odious | flirty, flavoring, flavour, lavender, fume, sensual, stingy, flavours |
| **flow** | still ↔ flowing | beit, lingering, always, sen, stiller, continue, persist, persisting | fluency, runny, flowchart, oozing, bubbling, blossoming, navigable, flo |
| **softness** | squishy ↔ rigid | lumpy, snuggled, squid, sappy, softer, squeaking, chewy, fuzzy | flatly, conformal, flexed, stoic, conformist, rugged, stout, constricted |
| **mystery** | obvious ↔ mysterious | unmistakable, eminent, recognizable, showy, indisputable, unobtrusive, identifiable, clear | ghostly, weird, unusual, magical, undiscovered, elusive, invisible, strangely |
| **tempo** | leisurely ↔ hurried | gently, slowing, lawn, comfortably, carefree, loitering, slower, plodding | shuffled, hustle, pressured, pacer, crowded, despatched, preoccupied, quickness |
| **sadness** | joyful ↔ mournful | resentful, happier, jolly, gaiety, hopeful, playful, celebratory, delight | pained, grieving, anguished, dejected, despondent, laments, saddens, forlorn |
| **bravery** | cowardly ↔ brave | ashamed, bravery, afraid, bashful, demure, contemptible, scumbag, awkwardly | stout, admirable, plucky, bravo, fiercely, valiant, headstrong, fierce |
| **concreteness** | abstract ↔ concrete | indexed, summery, alias, outlined, framework, subject, definition, analyze | monolithic, asphalt, bedrock, rubble, composite, mortar, congregate, paved |
| **confidence** | insecure ↔ confident | unprotected, shaky, secured, uncomfortable, suspicious, worrisome, jealous, fearing | boldly, trusting, ensured, presumptuous, unabashed, doubtless, affirmed, confided |
| **height** | short ↔ tall | diminutive, shortsighted, quickie, shorty, curtailed, skimpy, shortlist, midget | sizeable, tailed, talon, large, upright, telescopic, bulky, vast |
| **turbulence** | laminar ↔ turbulent | thinned, longitudinal, linings, flat, lathe, paneling, ply, lino | troubling, jumpy, disorderly, disturb, strenuous, muddy, tumbling, frothy |
| **certainty** | doubtful ↔ certain | hopeful, apprehensive, unconfirmed, disbelief, skepticism, unreliable, undecided, tentative | definitely, specific, safer, assure, quite, specially, sufficient, unquestionable |
| **pride** | humble ↔ proud | politely, apologetic, kindly, obedient, subservient, honorable, honoured, concedes | worthy, prominent, devoted, impressive, dedicated, praise, bragging, triumphantly |
| **lethality** | benign ↔ lethal | neutral, benevolence, neoplasms, positive, uncomplicated, mildly, naturally, suspicious | mortal, hazardous, harming, fatalities, loathsome, paralyzing, catastrophic, vicious |
| **particle** | fine ↔ coarse | tuned, dainty, quite, quality, flat, grained, smooth, fins | grits, rude, carb, gruff, gross, grind, cale, scaly |
| **tenderness** | tough ↔ tender | brute, strict, daunting, feisty, durable, harder, fiercely, hardest | softly, tensile, sensual, oft, gentleness, trying, succulent, ripe |
| **similarity** | different ↔ similar | changing, differentiated, dependent, ordinary, variation, differentiating, differentially, differences | interesting, matching, synonymous, comparing, identical, difference, identically, som |
| **silence** | talkative ↔ silent | chatter, storyteller, walkie, extrovert, spoke, discourse, hyperactive, fluent | slow, stealth, inaudible, stealthily, nim, passive, sleep, whisper |
| **volume_sound** | whispering ↔ shouting | squealing, moaning, whimper, quivering, overheard, mumble, aloud, whoring | holler, bawling, screamed, shing, swearing, bragging, roaring, barking |
| **speed_motion** | crawling ↔ racing | walking, creepers, treading, scratching, roaming, burrowing, prowling, catching | nascar, rugby, rally, rides, rallying, betting, steeplechase, speeding |

## Pairwise orthogonality (all candidates)

Absolute cosine similarity between every pair of candidate axis vectors. Values `> 0.4` indicate redundancy; `> 0.6` is strong overlap. Sorted to put accepted axes first.

Showing only pairs with cosine ≥ 0.30 (full data in JSON).

| Axis A | Axis B | |cos| |
|--------|--------|--------|
| conservatism | radicalism | 1.000 |
| polish | rough | 1.000 |
| transparency | opacity | 1.000 |
| concreteness | abstractness | 1.000 |
| wild | wildness | 1.000 |
| visible | visibility_social | 1.000 |
| visible | concealment | 1.000 |
| visibility_social | concealment | 1.000 |
| strictness | leniency | 1.000 |
| optimism | pessimism | 1.000 |
| rank | seniority | 1.000 |
| fresh_food | spoilage | 1.000 |
| violence_force | brutality | 1.000 |
| smelliness | odor | 1.000 |
| natural | artificiality | 1.000 |
| complexity | simplicity | 1.000 |
| public | privacy | 1.000 |
| brittleness | ductility | 1.000 |
| solidity | hollowness | 1.000 |
| orderliness | chaos | 1.000 |
| smooth_curve | jaggedness | 1.000 |
| health | sickness | 1.000 |
| salinity | sweetwater | 1.000 |
| particle | coarseness | 1.000 |
| particle | fineness | 1.000 |
| coarseness | fineness | 1.000 |
| crispness | sogginess | 1.000 |
| tenderness | toughness | 1.000 |
| sequence | order_rank | 1.000 |
| shielding | exposure | 1.000 |
| similarity | difference | 1.000 |
| skepticism | credulity | 1.000 |
| uniqueness | ordinariness | 1.000 |
| peace | war | 1.000 |
| hope | despair | 1.000 |
| fatigue | rest | 1.000 |
| virtue | vice | 1.000 |
| sobriety | intoxication | 1.000 |
| temperance | excess | 1.000 |
| count | singularity | 1.000 |

*(+3693 more pairs omitted)*
