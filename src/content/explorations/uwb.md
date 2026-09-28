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
    { path: '/assets/UWB-SoundStage-Phone.webp', alt: "L'app iPhone : trois balises, la position, la carte du salon", caption: "L'app SoundStage sur l'iPhone : distance à chaque balise (A, B, C), position fusionnée, carte du salon" },
    { path: '/assets/UWB-Node-Wiring.svg', alt: "Une balise : le shield DWM3000EVB relié au Pico", caption: "Une balise : shield Qorvo DWM3000EVB câblé à un Raspberry Pi Pico" },
    { path: '/assets/UWB-RoomSense-room-view-ar-anchored.png', alt: "RoomSense : la pièce vue par l'app, ancrée dans ARKit", caption: "RoomSense : la pièce et les objets appris, ancrés dans le repère de la caméra" },
    { path: '/assets/UWB-SoundStage-Map.webp', alt: "SoundStage sur le Mac : enceintes, balises, auditeur et objet sonore", caption: "SoundStage sur le Mac : enceintes (bleu), balises A/B/C, auditeur (vert) et l'objet « Voix » ; pour chaque enceinte, le retard et le gain du moment" }
]
---

Tout part d'une question simple : **les trois shields UWB que j'avais dans un tiroir peuvent-ils parler à un iPhone ?** L'iPhone embarque une puce UWB (U1/U2) et une API, Nearby Interaction, prévue pour des accessoires certifiés. Le kit officiel coûte cher et son firmware est un binaire fermé pour un autre microcontrôleur.

La réponse est oui. Le protocole de mesure, **FiRa**, est documenté et une implémentation ouverte existe côté Linux. Je l'ai réécrit pour le Raspberry Pi Pico : l'échange de paramètres, la synchronisation sur les trames de l'iPhone, le chiffrement des trames (clé statique, vérifiée contre les vecteurs de test), puis la réponse dans le créneau imparti, à quelques centaines de microsecondes près. Première session complète : 194 mesures sur 227, distance à 2 cm près.

<figure>
  <img src="/assets/UWB-Mesh-Ranging.svg" alt="Échange de trames entre deux nœuds pour mesurer une distance" />
  <figcaption>Une distance par temps de vol : chaque nœud horodate ce qu'il émet et ce qu'il reçoit ; deux allers-retours suffisent, et un troisième nœud qui écoute obtient la mesure gratuitement.</figcaption>
</figure>

À partir de là, trois directions, que je présente ci-dessous par onglets :

- **RoomSense** : deux balises au mur, l'iPhone sait dans quelle pièce et devant quel objet il se trouve, et pilote la maison (Home Assistant).
- **SoundStage** : trois balises, un home-cinéma 7.1, et un objet sonore virtuel qui reste à sa place quand on tourne autour.
- **Liaisons de données** : les mêmes cartes, entre elles, sans téléphone : mesure mutuelle des distances et échange de données à quelques mégabits par seconde.

Ce ne sont pas des produits. Ce sont des montages, des mesures, des impasses, et ce que j'en ai retenu.
