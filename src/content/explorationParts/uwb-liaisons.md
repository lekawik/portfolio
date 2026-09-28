---
parent: 'uwb'
tab: 'Liaisons de données'
order: 3
---

## Les cartes entre elles

Sans téléphone, les trois cartes forment un petit réseau : chacune émet à son tour dans un créneau, et chaque trame porte l'heure d'émission et l'heure de réception des dernières trames entendues. Avec ces horodatages, chaque carte reconstruit *toutes* les distances du groupe, y compris celles qu'elle n'a pas mesurées elle-même. Pas de maître, pas d'ancre : une carte qui arrive écoute, prend un créneau libre, et la matrice des distances se met à jour chez tout le monde.

<figure>
  <img src="/assets/UWB-Mesh-Superframe.svg" alt="Découpage du temps en créneaux de mesure et de données" />
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
