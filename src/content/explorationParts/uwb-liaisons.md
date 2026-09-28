---
parent: 'uwb'
tab: 'Liaisons de données'
order: 3
---

## Les cartes entre elles

Sans téléphone, les trois cartes forment un petit réseau : chacune émet à son tour dans un créneau, et chaque trame porte l'heure d'émission et l'heure de réception des dernières trames entendues. Avec ces horodatages, chaque carte reconstruit *toutes* les distances du groupe, y compris celles qu'elle n'a pas mesurées elle-même. Pas de maître, pas d'ancre : une carte qui arrive écoute, prend un créneau libre, et la matrice des distances se met à jour chez tout le monde.

<figure>
  <svg class="fig-uwb-mesh-superframe w-full h-auto" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 680 240" role="img" aria-label="Superframe layout for ten nodes">
<style>.fig-uwb-mesh-superframe { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif; font-size: 11px; }
  .fig-uwb-mesh-superframe { --ink:#14213d; --muted:#5b6472; --tint:#eef3f5; --rng:#0f7c8a; --rng-soft:#d5edf0; --dat:#d98a1f; --dat-soft:#f8e3c2; --paper:#fff; }
  @media (prefers-color-scheme: dark) { .fig-uwb-mesh-superframe { --ink:#f2f2f7; --muted:#a1a1aa; --tint:#1c1c1e; --rng:#4fc3d1; --rng-soft:#0f3b42; --dat:#f0b35a; --dat-soft:#4a3410; --paper:#000; } }
  .fig-uwb-mesh-superframe .box { fill: var(--paper); stroke: var(--ink); stroke-width: 1.2; }
  .fig-uwb-mesh-superframe .box-t { fill: var(--tint); stroke: var(--ink); stroke-width: 1.2; }
  .fig-uwb-mesh-superframe .ln { stroke: var(--ink); stroke-width: 1.2; fill: none; }
  .fig-uwb-mesh-superframe .ln-d { stroke: var(--dat); stroke-width: 1.5; fill: none; }
  .fig-uwb-mesh-superframe .ln-m { stroke: var(--muted); stroke-width: 0.8; fill: none; }
  .fig-uwb-mesh-superframe .ln-r { stroke: var(--rng); stroke-width: 1.5; fill: none; }
  .fig-uwb-mesh-superframe .t-b { font-weight: 600; fill: var(--ink); }
  .fig-uwb-mesh-superframe .t-s { font-size: 9.5px; fill: var(--muted); }
  .fig-uwb-mesh-superframe .t-w { fill: #fff; font-weight: 600; }
  .fig-uwb-mesh-superframe .dash { stroke-dasharray: 4 3; }
  .fig-uwb-mesh-superframe .dat { fill: var(--dat); } .fig-uwb-mesh-superframe .dats { fill: var(--dat-soft); stroke: var(--dat); stroke-width: 1; }
  .fig-uwb-mesh-superframe .rng { fill: var(--rng); } .fig-uwb-mesh-superframe .rngs { fill: var(--rng-soft); stroke: var(--rng); stroke-width: 1; }
  .fig-uwb-mesh-superframe text { fill: var(--ink); }
</style>
<defs>
  <marker id="fig-uwb-mesh-superframe-ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" style="fill:var(--ink)"/></marker>
  <marker id="fig-uwb-mesh-superframe-ahr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" style="fill:var(--rng)"/></marker>
  <marker id="fig-uwb-mesh-superframe-ahm" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" style="fill:var(--muted)"/></marker>
</defs>
    <text x="20" y="12" class="t-b">Supertrame, N = 10 : 23,9 ms</text>
    <!-- ranging slots -->
    <g>
      <rect x="20" y="26" width="162" height="40" class="rngs"/>
      <g class="ln-m" stroke="#0f7c8a">
        <line x1="36.2" y1="26" x2="36.2" y2="66"/><line x1="52.4" y1="26" x2="52.4" y2="66"/><line x1="68.6" y1="26" x2="68.6" y2="66"/><line x1="84.8" y1="26" x2="84.8" y2="66"/><line x1="101" y1="26" x2="101" y2="66"/><line x1="117.2" y1="26" x2="117.2" y2="66"/><line x1="133.4" y1="26" x2="133.4" y2="66"/><line x1="149.6" y1="26" x2="149.6" y2="66"/><line x1="165.8" y1="26" x2="165.8" y2="66"/>
      </g>
    </g>
    <!-- data slots -->
    <g>
      <rect x="182" y="26" width="478" height="40" class="dats"/>
      <g stroke="#d98a1f" stroke-width="0.8">
        <line x1="229.8" y1="26" x2="229.8" y2="66"/><line x1="277.6" y1="26" x2="277.6" y2="66"/><line x1="325.4" y1="26" x2="325.4" y2="66"/><line x1="373.2" y1="26" x2="373.2" y2="66"/><line x1="421" y1="26" x2="421" y2="66"/><line x1="468.8" y1="26" x2="468.8" y2="66"/><line x1="516.6" y1="26" x2="516.6" y2="66"/><line x1="564.4" y1="26" x2="564.4" y2="66"/><line x1="612.2" y1="26" x2="612.2" y2="66"/>
      </g>
      <g text-anchor="middle" class="t-b">
        <text x="206" y="50">D0</text><text x="254" y="50">D1</text><text x="301" y="50">D2</text><text x="349" y="50">D3</text><text x="397" y="50">D4</text><text x="445" y="50">D5</text><text x="493" y="50">D6</text><text x="540" y="50">D7</text><text x="588" y="50">D8</text><text x="636" y="50">D9</text>
      </g>
    </g>
    <text x="42" y="82" class="t-s">R0 … R9 : section de mesure, 10 × 603 µs</text>
    <text x="660" y="82" text-anchor="end" class="t-s">section de données, 10 × 1783 µs — le créneau d appartient au nœud d mod N</text>
    <!-- zoom ranging slot -->
    <path d="M20 90 L20 120 M36.2 66 L36.2 90 L300 120" class="ln-m dash"/>
    <text x="20" y="168" class="t-b">un créneau de mesure, 603 µs</text>
    <rect x="20" y="122" width="70" height="30" class="box-t"/><text x="55" y="141" text-anchor="middle" class="t-s">150 µs</text>
    <rect x="90" y="122" width="140" height="30" class="rng"/><text x="160" y="141" text-anchor="middle" class="t-w">trame 142 o · 302 µs</text>
    <rect x="230" y="122" width="70" height="30" class="box-t"/><text x="265" y="141" text-anchor="middle" class="t-s">garde</text>
    <text x="20" y="182" class="t-s">marge de synchro 150 µs · la garde inclut les ~150 µs de réarmement du récepteur</text>
    <!-- zoom data slot -->
    <path d="M612.2 66 L612.2 90 L340 120 M660 90 L660 120" class="ln-m dash"/>
    <text x="340" y="168" class="t-b">un créneau de données, 1783 µs</text>
    <rect x="340" y="122" width="27" height="30" class="box-t"/>
    <rect x="367" y="122" width="266" height="30" class="dat"/><text x="500" y="141" text-anchor="middle" class="t-w">trame 1021 o · 1482 µs en l'air</text>
    <rect x="633" y="122" width="27" height="30" class="box-t"/>
    <text x="340" y="182" class="t-s">en-tête + horodatages ≈ 60–120 o, le reste (≈ 900–960 o) est de la donnée</text>
    <text x="20" y="216" class="t-s">Taux d'occupation ≈ 75 %. Le quart restant, ce sont les marges qui rendent le cadencement robuste : erreur d'horloge entre nœuds, temps pendant lequel</text>
    <text x="20" y="228" class="t-s">un récepteur est aveugle en se réarmant, préambule et en-têtes. À l'échelle horizontalement dans chaque ligne.</text>
  </svg>
  <figcaption>Le temps est découpé en créneaux : d'abord une courte trame de mesure par nœud, puis un créneau de données par nœud, prêté aux autres quand il est vide.</figcaption>
</figure>

**Ce que mesure le banc.** Trois cartes, matrice complète sur chacune, écart-type de 6 à 9 mm par paire à 25 mesures par seconde, zéro erreur de trame. Une distance mesurée par un nœud et la même distance « entendue » par un troisième concordent au millimètre. La même radio transporte des données : 2,5 Mbit/s dans un sens, 1,27 + 1,27 Mbit/s dans les deux, avec la mesure de distance qui continue à 90 Hz.

## Ce qui a demandé le plus de travail

**L'horloge de la puce n'avance pas pendant l'écoute.** Le compteur de temps du DW3110 ne se rafraîchit qu'à l'état de repos. Le premier firmware voyait le temps sauter de 64 créneaux et n'émettait jamais. La solution : compter le temps sur le microcontrôleur et se recaler sur la puce à chaque passage au repos.

**Lire une trame rend sourd.** Lire une trame de 1 Ko par SPI prend jusqu'à une milliseconde, pendant laquelle la trame suivante est perdue. Réarmer le récepteur *avant* de lire, en s'appuyant sur le fait que la lecture est plus rapide que l'écriture radio, a ramené le temps sourd à 150 µs, quelle que soit la taille des trames. Et l'horloge SPI compte : à 8 MHz la trame suivante rattrape la lecture et corrompt les données en silence.

**La calibration.** L'erreur de délai d'antenne se corrige par carte, sur un triangle équilatéral d'un mètre mesuré au mètre ruban. Deux fois j'ai calibré contre une distance supposée plutôt que mesurée, et deux fois j'ai eu 20 cm d'erreur. Toujours mesurer d'abord.

## Ce que j'en retiens

- Le débit utile d'une puce à 6,8 Mbit/s en partage de temps, c'est 2 à 3 Mbit/s pour tout le groupe, quel que soit le nombre de nœuds. Au-delà, il faut réutiliser le canal dans l'espace, pas optimiser le logiciel.
- Un simulateur multi-nœuds côté PC, qui exécute le vrai code, a trouvé les problèmes de synchronisation avant le matériel. Le matériel a trouvé tout le reste.
- Le rapport technique complet (en anglais) sera publié avec le code.
