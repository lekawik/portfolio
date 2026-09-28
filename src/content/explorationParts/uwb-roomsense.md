---
parent: 'uwb'
tab: 'RoomSense'
order: 1
islands: ["body-block-story"]
---

## Une maison qui sait où l'on est

Deux balises au mur, l'iPhone dans la main. L'app connaît la distance à chacune, plusieurs fois par seconde, et la caméra (ARKit) apporte ce que deux distances seules ne donnent pas : de quel côté on se trouve. On « apprend » les objets de la pièce en se plaçant devant eux (« ajouter cet objet ici »), puis l'app reconnaît qu'on s'en approche.

<figure class="grid grid-cols-2 gap-3">
  <img src="/assets/UWB-RoomSense-room-view-setup-mode.png" alt="Mode réglage : les balises et les objets appris" class="rounded-3xl" />
  <img src="/assets/UWB-RoomSense-approaching-object.png" alt="Approche d'un objet : le retour haptique monte" class="rounded-3xl" />
  <figcaption class="col-span-2">À gauche, la pièce en mode réglage ; à droite, l'approche d'un objet appris : le téléphone vibre de plus en plus finement, comme un HomePod qu'on approche.</figcaption>
</figure>

**Ce qui se passe quand on s'approche.** Un retour haptique continu dont l'intensité et la « brillance » suivent la distance, puis, sous un rayon réglable, la fiche de commande de l'objet s'ouvre : un thermostat, une lampe, une prise. Les objets sont liés à des entités **Home Assistant** ; la commande part par l'API REST avec un jeton stocké dans le trousseau.

<figure>
  <img src="/assets/UWB-RoomSense-control-sheet-thermostat.png" alt="Fiche de commande d'un thermostat ouverte en s'approchant" class="max-w-xs mx-auto rounded-3xl" />
  <figcaption>Devant le thermostat, sa fiche s'ouvre toute seule.</figcaption>
</figure>

## Ce qui a demandé le plus de travail

**Le repère.** Deux balises, c'est une droite : la position a un côté ambigu. La caméra lève l'ambiguïté, mais sa carte du monde dérive et se réinitialise. Le repère de la pièce est donc *re-mesuré en continu* : les positions de la caméra et les distances brutes aux balises alimentent un ajustement robuste qui replace les balises, avec un score de qualité, et les objets sont reprojetés quand le repère s'affine. L'écart entre balises mesuré ainsi se répète à 1 cm d'une session à l'autre, là où l'estimation native variait de 40 cm.

**Le corps.** Une balise cachée derrière le dos lit 20 à 100 cm de trop pendant plusieurs secondes. L'erreur UWB est à sens unique : une distance trop *longue* est suspecte, une distance trop courte presque jamais. Le filtre en tient compte, mesure par mesure.

**Un mode « test de précision »** enregistre des points repères au sol (scotch) et les revérifie d'une session à l'autre, en séparant rotation, décalage et résidu.

## Ce que j'en retiens

- Deux balises espacées d'un mètre et des objets à 2,5 m : 5 cm d'erreur sur une balise font 3°, donc 15 cm à l'objet. Il faut écarter les balises, ou en ajouter une troisième. C'est ce qui a mené à SoundStage.
- La sensation « ça marche au millimètre » vient surtout de la caméra ; l'UWB, lui, garantit que la carte ne dérive pas.

Dessous, l'histoire en six étapes : trois balises, un téléphone, et ce que fait une distance faussée par le corps.
