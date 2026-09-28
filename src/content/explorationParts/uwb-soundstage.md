---
parent: 'uwb'
tab: 'SoundStage'
order: 2
islands: ["soundstage-walk"]
---

## Des enceintes qui savent où vous êtes

Un home-cinéma sait faire venir un son de la gauche ou de la droite, quand on est assis à la bonne place. Si les enceintes *savent où l'on est*, on peut poser un objet sonore à un endroit fixe du salon et se promener autour : quand je passe derrière, le son passe devant.

**Le montage.** Trois balises scotchées aux murs, qui se mesurent entre elles au démarrage puis se mettent en mode FiRa dès que le téléphone se connecte. L'iPhone fusionne UWB et caméra et envoie sa position 20 fois par seconde au Mac. Le Mac calcule, pour chaque enceinte, un retard et un gain à partir de la position de l'auditeur, répartit l'objet sur les deux enceintes qui l'encadrent *vu de l'auditeur*, et sort 8 canaux par HDMI vers l'ampli en mode direct.

<figure>
  <img src="/assets/UWB-SoundStage-Map.webp" alt="La carte du salon dans l'app Mac" />
  <figcaption>L'app Mac : pour chaque enceinte, le retard (ms) et le gain (×) du moment. L'objet « Voix » est réparti sur L et C, les deux enceintes qui l'encadrent vu de l'auditeur.</figcaption>
</figure>

**Les enceintes sont localisées par le son.** Le Mac joue un clic par enceinte, le téléphone les enregistre et n'a besoin que des *écarts* d'arrivée : aucune synchronisation d'horloge. Une quarantaine de positions dans la pièce, un solveur robuste, et la carte des enceintes est connue à 8 cm près.

**Et calibrées par le son.** Une bouffée de bruit rose par enceinte, mesurée au micro du téléphone en neuf points ; on en déduit le niveau de chaque enceinte et son timbre par bande d'octave. Résultat mesuré : les enceintes avant étaient 2 à 3 dB trop fortes et plus riches à 500 Hz, les arrières plus présentes à 2 kHz. Deux corrections, et la voix garde le même timbre en passant de l'avant à l'arrière.

<figure>
  <img src="/assets/UWB-SoundStage-Levels.png" alt="Calibration des niveaux par enceinte" />
  <figcaption>La calibration : le téléphone vérifie d'abord sa propre linéarité (un pas de 6 dB doit se mesurer à 6 dB ± 0,5), puis mesure chaque enceinte.</figcaption>
</figure>

## Ce que ça ne peut pas faire, et pourquoi

En tournant autour de l'objet, la direction est juste, mais il « sonne » à 4 mètres alors qu'il est à 1,4 m. C'est physique : une image fantôme entre deux enceintes ne peut exister que *sur* la ligne qui les joint, et des enceintes encastrées à 4 m produisent le rapport son direct / réverbéré de 4 m, qui est le premier indice de distance pour l'oreille.

Ce que dit la littérature : changer la **directivité** de l'enceinte (Laitinen &amp; Pulkki, 2015), impossible avec des enceintes murales ; les **sources focalisées** de la synthèse de front d'onde, qui demandent des dizaines d'enceintes ; ou le **transaural**, l'annulation de la diaphonie entre les deux oreilles avec suivi de la tête, seule voie avec peu d'enceintes. Je l'ai implémenté en expérimental, sur la bande 600–1800 Hz, là où 2–3 cm d'erreur de position restent petits devant la longueur d'onde. Verdict à l'écoute : pas encore.

## Ce que j'en retiens

- Le premier rendu compensait la distance en champ libre, jusqu'à +12 dB sur les enceintes lointaines : les avant dominaient tout. Un salon n'est pas un champ libre ; la compensation est maintenant *mesurée* et bornée à ±3 dB.
- Un micro d'iPhone suffit pour cartographier et calibrer des enceintes, à condition de ne mesurer que des écarts et des rapports.
- Une revue de code par un second modèle a trouvé cinq vrais défauts en une passe, dont deux que j'entendais sans les comprendre.

Dessous, le rendu dans votre navigateur : au casque, déplacez-vous autour de la voix.
