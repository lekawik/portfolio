---
title: 'Trois balises UWB et un iPhone'
techs: ["UWB (DW3000)", "Raspberry Pi Pico", "FiRa", "Nearby Interaction", "Swift", "C temps réel", "ARKit"]
description: "Faire dialoguer trois cartes UWB à 30 € avec un iPhone, puis s'en servir : une maison qui sait où l'on est, des enceintes qui suivent l'auditeur, une liaison de données entre cartes."
order: 1
period: 'septembre 2026'
takeaways: [
    "L'iPhone accepte une balise UWB « maison » : le protocole FiRa se réimplémente sur un microcontrôleur à 4 €, sans le module propriétaire.",
    "La mesure est bonne au centimètre ; l'ennemi, c'est le corps de l'utilisateur, qui bloque l'onde et allonge la distance.",
    "Le rendu sonore par enceintes place très bien la direction et jamais la distance : c'est une limite physique, pas logicielle."
]
images: [
    { path: '/assets/UWB-Header.webp', alt: "L'app SoundStage sur l'iPhone : trois balises, la position, la carte du salon", caption: "L'iPhone mesure sa distance à trois balises (A, B, C) et se place sur la carte du salon" },
    { path: '/assets/UWB-RoomSense.webp', alt: "RoomSense : la pièce et les objets appris, puis l'approche d'un thermostat", caption: "RoomSense : la pièce et les objets appris ; en s'approchant du thermostat, sa fiche s'ouvre" },
    { path: '/assets/UWB-SoundStage.webp', alt: "SoundStage sur le Mac : enceintes, balises, auditeur et objet sonore", caption: "SoundStage sur le Mac : l'objet « Voix » est réparti sur les deux enceintes qui l'encadrent vu de l'auditeur, avec le retard et le gain de chaque enceinte" },
    { path: '/assets/UWB-Mesh.webp', alt: "Le visualiseur du maillage : cinq cartes, la matrice des distances, les liaisons de données", caption: "Cinq cartes en simulation : la constellation, la matrice des distances et les liaisons de données, telles que n'importe quelle carte les voit" }
]
---

Tout part d'une question simple : **les trois shields UWB que j'avais dans un tiroir peuvent-ils parler à un iPhone ?** L'iPhone embarque une puce UWB (U1/U2) et une API, Nearby Interaction, prévue pour des accessoires certifiés. Le kit officiel coûte cher et son firmware est un binaire fermé pour un autre microcontrôleur.

La réponse est oui. Le protocole de mesure, **FiRa**, est documenté et une implémentation ouverte existe côté Linux. Je l'ai réécrit pour le Raspberry Pi Pico : l'échange de paramètres, la synchronisation sur les trames de l'iPhone, le chiffrement des trames (clé statique, vérifiée contre les vecteurs de test), puis la réponse dans le créneau imparti, à quelques centaines de microsecondes près. Première session complète : 194 mesures sur 227, distance à 2 cm près.

<figure>
  <svg class="fig-uwb-mesh-ranging w-full h-auto" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 680 330" role="img" aria-label="Timing ladder for broadcast two-way ranging">
<style>.fig-uwb-mesh-ranging { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif; font-size: 11px; }
  .fig-uwb-mesh-ranging { --ink:#14213d; --muted:#5b6472; --tint:#eef3f5; --rng:#0f7c8a; --rng-soft:#d5edf0; --dat:#d98a1f; --dat-soft:#f8e3c2; --paper:#fff; }
  @media (prefers-color-scheme: dark) { .fig-uwb-mesh-ranging { --ink:#f2f2f7; --muted:#a1a1aa; --tint:#1c1c1e; --rng:#4fc3d1; --rng-soft:#0f3b42; --dat:#f0b35a; --dat-soft:#4a3410; --paper:#000; } }
  .fig-uwb-mesh-ranging .box { fill: var(--paper); stroke: var(--ink); stroke-width: 1.2; }
  .fig-uwb-mesh-ranging .box-t { fill: var(--tint); stroke: var(--ink); stroke-width: 1.2; }
  .fig-uwb-mesh-ranging .ln { stroke: var(--ink); stroke-width: 1.2; fill: none; }
  .fig-uwb-mesh-ranging .ln-d { stroke: var(--dat); stroke-width: 1.5; fill: none; }
  .fig-uwb-mesh-ranging .ln-m { stroke: var(--muted); stroke-width: 0.8; fill: none; }
  .fig-uwb-mesh-ranging .ln-r { stroke: var(--rng); stroke-width: 1.5; fill: none; }
  .fig-uwb-mesh-ranging .t-b { font-weight: 600; fill: var(--ink); }
  .fig-uwb-mesh-ranging .t-s { font-size: 9.5px; fill: var(--muted); }
  .fig-uwb-mesh-ranging .t-w { fill: #fff; font-weight: 600; }
  .fig-uwb-mesh-ranging .dash { stroke-dasharray: 4 3; }
  .fig-uwb-mesh-ranging .dat { fill: var(--dat); } .fig-uwb-mesh-ranging .dats { fill: var(--dat-soft); stroke: var(--dat); stroke-width: 1; }
  .fig-uwb-mesh-ranging .rng { fill: var(--rng); } .fig-uwb-mesh-ranging .rngs { fill: var(--rng-soft); stroke: var(--rng); stroke-width: 1; }
  .fig-uwb-mesh-ranging text { fill: var(--ink); }
</style>
<defs>
  <marker id="fig-uwb-mesh-ranging-ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" style="fill:var(--ink)"/></marker>
  <marker id="fig-uwb-mesh-ranging-ahr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" style="fill:var(--rng)"/></marker>
  <marker id="fig-uwb-mesh-ranging-ahm" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" style="fill:var(--muted)"/></marker>
</defs>
    <!-- lifelines -->
    <text x="130" y="18" text-anchor="middle" class="t-b">nœud A</text>
    <text x="360" y="18" text-anchor="middle" class="t-b">nœud B</text>
    <text x="560" y="18" text-anchor="middle" class="t-b">nœud C (à l'écoute)</text>
    <line x1="130" y1="26" x2="130" y2="310" class="ln"/>
    <line x1="360" y1="26" x2="360" y2="310" class="ln"/>
    <line x1="560" y1="26" x2="560" y2="310" class="ln-m"/>
    <!-- frames -->
    <line x1="130" y1="50" x2="360" y2="68" class="ln-r" marker-end="url(#fig-uwb-mesh-ranging-ahr)"/>
    <line x1="360" y1="68" x2="560" y2="84" class="ln-m dash" marker-end="url(#fig-uwb-mesh-ranging-ahm)"/>
    <text x="245" y="50" text-anchor="middle" class="t-b">trame A₁</text>
    <line x1="360" y1="130" x2="130" y2="148" class="ln-r" marker-end="url(#fig-uwb-mesh-ranging-ahr)"/>
    <line x1="360" y1="130" x2="560" y2="146" class="ln-m dash" marker-end="url(#fig-uwb-mesh-ranging-ahm)"/>
    <text x="245" y="128" text-anchor="middle" class="t-b">trame B₁</text>
    <text x="245" y="160" text-anchor="middle" class="t-s">porte : heure de réception de A₁</text>
    <line x1="130" y1="210" x2="360" y2="228" class="ln-r" marker-end="url(#fig-uwb-mesh-ranging-ahr)"/>
    <line x1="360" y1="228" x2="560" y2="244" class="ln-m dash" marker-end="url(#fig-uwb-mesh-ranging-ahm)"/>
    <text x="245" y="208" text-anchor="middle" class="t-b">trame A₂</text>
    <text x="245" y="240" text-anchor="middle" class="t-s">porte : heure de réception de B₁</text>
    <line x1="360" y1="286" x2="130" y2="304" class="ln-r" marker-end="url(#fig-uwb-mesh-ranging-ahr)"/>
    <line x1="360" y1="286" x2="560" y2="302" class="ln-m dash" marker-end="url(#fig-uwb-mesh-ranging-ahm)"/>
    <text x="245" y="284" text-anchor="middle" class="t-b">trame B₂</text>
    <text x="245" y="316" text-anchor="middle" class="t-s">porte : heure de réception de A₂</text>
    <!-- intervals A side -->
    <line x1="100" y1="50" x2="100" y2="148" class="ln" marker-start="url(#fig-uwb-mesh-ranging-ah)" marker-end="url(#fig-uwb-mesh-ranging-ah)"/>
    <text x="92" y="103" text-anchor="end" class="t-b">Ra</text>
    <line x1="100" y1="152" x2="100" y2="210" class="ln" marker-start="url(#fig-uwb-mesh-ranging-ah)" marker-end="url(#fig-uwb-mesh-ranging-ah)"/>
    <text x="92" y="185" text-anchor="end" class="t-b">Da</text>
    <text x="20" y="70" class="t-s">mesuré sur</text><text x="20" y="81" class="t-s">l'horloge de A</text>
    <!-- intervals B side -->
    <line x1="390" y1="68" x2="390" y2="130" class="ln" marker-start="url(#fig-uwb-mesh-ranging-ah)" marker-end="url(#fig-uwb-mesh-ranging-ah)"/>
    <text x="398" y="103" class="t-b">Db</text>
    <line x1="390" y1="134" x2="390" y2="228" class="ln" marker-start="url(#fig-uwb-mesh-ranging-ah)" marker-end="url(#fig-uwb-mesh-ranging-ah)"/>
    <text x="398" y="185" class="t-b">Rb</text>
    <text x="398" y="158" class="t-s">mesuré sur</text><text x="398" y="169" class="t-s">l'horloge de B</text>
    <!-- bystander note -->
    <text x="554" y="180" class="t-s">entend les quatre trames,</text>
    <text x="554" y="192" class="t-s">donc possède tous les</text>
    <text x="554" y="204" class="t-s">horodatages et peut</text>
    <text x="554" y="216" class="t-s">calculer A–B lui-même</text>
  </svg>
  <figcaption>Une distance par temps de vol : chaque nœud horodate ce qu'il émet et ce qu'il reçoit ; deux allers-retours suffisent, et un troisième nœud qui écoute obtient la mesure gratuitement.</figcaption>
</figure>

À partir de là, trois directions, que je présente ci-dessous par onglets :

- **RoomSense** : deux balises au mur, l'iPhone sait dans quelle pièce et devant quel objet il se trouve, et pilote la maison (Home Assistant).
- **SoundStage** : trois balises, un home-cinéma 7.1, et un objet sonore virtuel qui reste à sa place quand on tourne autour.
- **Liaisons de données** : les mêmes cartes, entre elles, sans téléphone : mesure mutuelle des distances et échange de données à quelques mégabits par seconde.

Ce ne sont pas des produits. Ce sont des montages, des mesures, des impasses, et ce que j'en ai retenu.
