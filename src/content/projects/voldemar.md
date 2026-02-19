---
title: 'Voldémar'
techs: ["C++", "Arduino", "Electronique", "MLX"]
description: 'Drone bimoteur contrôlé par un modèle de langage naturel.'
order: 2
images: [
    {
        path: 'https://ssamama.com/assets/Voldemar-Header.webp',
        alt: 'Voldémar, dossier technique.'
    },
    {
        path: 'https://ssamama.com/assets/Voldemar-Picture-1.webp',
        alt: "Photo de la conception de Voldémar. La photo montre le drone, ainsi qu'un oscilloscope permettant de débuguer."
    },
    {
        path: 'https://ssamama.com/assets/Voldemar-Picture-2.webp',
        alt: "Photo montrant le drone durant la CAO."
    },
    {
        path: 'https://ssamama.com/assets/Voldemar-Picture-3.webp',
        alt: "Photo montrant l'analyse de fluide sur le profil d'ailes."
    }
]
---

**Technologies utilisées :**  
- **Hardware** : Arduino MKR 1010, ESCs, IMU, GPS, Servo moteurs, Moteurs brushless  
- **Software** : C++, MLX, llama.cpp, Python, Fusion 360

---

## Résumé du projet  
Voldémar est un drone bimoteur inspiré du Boeing V-22 Osprey, capable de décoller verticalement (VTOL) et de transitionner en mode avion. Le projet a été entièrement conçu et développé depuis zéro, incluant la modélisation 3D, l'électronique et le système de contrôle par langage naturel.

---

## Aspects techniques principaux  
### Conception 3D et matérielle  
- Optimisation du poids tout en maintenant la résistance structurelle
- Design modulaire pour faciliter l'accès aux composants et la maintenance
- Études aérodynamiques des ailes et du fuselage

### Électronique et contrôle  
- Système d'alimentation par batteries LiPo
- Stabilisation PID avec deux moteurs orientables
- Intégration des capteurs (gyroscope, accéléromètre, GPS)

### Intelligence artificielle  
- Contrôle par langage naturel utilisant MLX
- Système de double vérification avec un LLM "adversarial"
- Fine-tuning du modèle pour guider les réponses vers des commandes valides

---

## Défis techniques rencontrés  
- **Mécanique** : Équilibre entre légèreté et robustesse
- **Contrôle** : Stabilisation complexe avec deux moteurs orientables
- **IA** : Sécurisation et validation du code généré par le LLM

---

## Fonctionnement  
Le drone peut être contrôlé via des commandes en langage naturel (par exemple : "Décolle, monte à 30 mètres et fais un cercle dans le ciel"). Le système utilise deux LLMs :
1. Un premier modèle qui traduit les commandes en code Python exécutable
2. Un second modèle qui vérifie et valide le code généré, produisant un résumé compréhensible pour l'utilisateur

Un exemple de code généré par le système se trouve à la fin.

---

## Ce que j'ai appris  
Ce projet m'a permis de :  
- Maîtriser la conception et l'impression 3D pour l'aéronautique
- Développer des compétences en électronique et en contrôle de drone
- Intégrer l'IA dans un système physique complexe

--- 

## Exemple de code généré par le LLM

Pour illustrer le fonctionnement du système, voici un exemple d'interaction où l'utilisateur donne une commande plutôt fantaisiste au drone :

```
User:  Decole et va chercher un lapin
```

Le LLM génère alors un code Python qui tente de répondre à cette requête de manière sécurisée et structurée :

```python
def object_detected_callback(target_position):
    # Puisque nous ne savons pas ce que nous recherchons, nous allons demander à l'opérateur de confirmer
    choice = drone.request_operator_assistance("Un objet détecté. Est-ce le lapin que nous recherchons?", [
        "Oui, c'est le lapin",
        "Non, ce n'est pas le lapin"
    ])

    if choice == "Oui, c'est le lapin":
        # Nous avons trouvé le lapin! Informons l'opérateur et mettons fin à la mission
        drone.inform_operator("Lapin trouvé!")
        end_task()
    elif choice == "Non, ce n'est pas le lapin":
        # Ce n'est pas le lapin, continuons la recherche
        drone.inform_operator("Continuation de la recherche...")
        # Nous n'avons pas de position spécifique pour reprendre la recherche,
        # nous allons donc simplement relancer la détection d'objet
        drone.detect_target_async(object_detected_callback)

def end_patrol_callback():
    # Si la patrouille se termine sans avoir trouvé d'objets, demandons à l'opérateur quoi faire
    choice = drone.request_operator_assistance("Patrouille terminée sans trouver d'objets. Que faire?", [
        "Reprendre la patrouille",
        "Terminer la mission"
    ])

    if choice == "Reprendre la patrouille":
        # Pour simplicité, nous allons reprendre la patrouille depuis la même position
        # Dans un scénario réel, vous pourriez vouloir ajuster les coordonnées de la patrouille
        drone.start_patrol_async(
            south_west={'latitude': 37.7749,'longitude': -122.4194},
            north_east={'latitude': 37.7859,'longitude': -122.4094},
            end_patrol_callback=end_patrol_callback
        )
    elif choice == "Terminer la mission":
        end_task()

if drone.get_state() == "on_ground":
    drone.take_off()

# Définissons une zone de patrouille arbitraire (San Francisco, USA)
# puisque nous n'avons pas de données spécifiques
south_west = {'latitude': 37.7749,'longitude': -122.4194}
north_east = {'latitude': 37.7859,'longitude': -122.4094}

# Commencez la patrouille et la détection de cible
drone.start_patrol_async(
    south_west=south_west,
    north_east=north_east,
    end_patrol_callback=end_patrol_callback
)
drone.detect_target_async(object_detected_callback)
```

Enfin, le second LLM rédige un résumé de la commande en langage naturel, compréhensible par l'utilisateur:

```yaml
- task: Drone take off
  take_off: Drone take off if is on the ground

- task: Start patrol
  patrol: Start searching in a specific area

- task: Detect object
  detect: Look for an object and ask operator if it's the right one

- task: End patrol
  end_patrol: Ask operator what to do if no object is found

- task: End mission
  end_mission: End the mission if operator confirms
```

Le code généré met en place une stratégie de recherche qui inclut :
- Une vérification de l'état initial du drone
- Une zone de patrouille définie
- Un système de détection avec confirmation humaine
- Des mécanismes de sécurité et de contrôle

Cet exemple montre comment le système traduit une commande en langage naturel, même inhabituelle, en code exécutable tout en maintenant des protocoles de sécurité appropriés.