---
title: 'PolyApp'
techs: ["Swift", "UIKit", "Vapor", "Redis"]
description: 'App iOS pour centraliser planning, tâches et notes, utilisée par les étudiants de Polytech Paris-Saclay.'
order: 5
images: [
    {
        path: 'https://ssamama.com/assets/PolyApp-Header.webp',
        alt: 'PolyApp'
    },
    {
        path: 'https://ssamama.com/assets/PolyApp-Calendar.webp',
        alt: 'Calendar'
    },
    {
        path: 'https://ssamama.com/assets/PolyApp-Tasks.webp',
        alt: 'Tasks'
    },
    { 
        path: 'https://ssamama.com/assets/PolyApp-Grades.webp',
        alt: 'Grades'
    }
]
---

**Technologies utilisées :**  
- **Application iOS** : Swift, UIKit, MVVM-C, Combine, SQLiteData/GRDB, WidgetKit  
- **Backend planning** : Swift (Vapor), Redis, OpenTelemetry, ADE GWT RPC (reverse engineering)

---

## Résumé du projet  
PolyApp est une application iOS que j’ai développée pour les étudiants de Polytech Paris-Saclay.  
Objectif : centraliser l’emploi du temps, les tâches et les notes dans une interface native, rapide et fiable, avec persistance locale et synchronisation intelligente.  
Aujourd’hui, l’app est utilisée par **41 étudiants (février 2026)** via **TestFlight**, avec un usage quotidien sur les flux planning + tâches + notes.

---

## Fonctionnalités principales  
- Calendrier emploi du temps multi-jours avec filtres, détails de cours et recherche de ressources ADE  
- Gestion des tâches (priorités, sous-tâches, rappels, archivage), avec lien optionnel vers un cours  
- Consultation des notes (années, semestres, modules, matières) avec cache local  
- Onboarding guidé pour sélectionner ses ressources planning et configurer les comptes  
- Widget iOS pour afficher les prochains cours avec personnalisation symbole/couleur

---

## Adoption et usage réel  
- Utilisation active par **41 étudiants (février 2026)**  
- Distribution en **TestFlight**  
- Cas d’usage principal : vérifier rapidement les prochains cours, filtrer par groupes, puis transformer les cours en tâches actionnables  
- Usage renforcé par le mode local-first : les données restent consultables même quand le réseau ou les services upstream sont instables

---

## Détails techniques côté iOS  
- Architecture modulaire en Swift Packages (`PlannerFeature`, `GradesFeature`, `SettingsFeature`, `Onboarding`, `Storage`, `PolyTableAPI`, etc.)  
- Navigation `MVVM-C` avec coordinators, et binding d’état via `Combine`  
- Persistance unique SQLite (`SQLiteData`/`GRDB`) pour events, tasks, grades, symboles  
- Widget relié à la même base partagée pour afficher les cours à venir sans duplication de logique

---

## Backbone : PolyApp API (Reverse RPC ADE)  
Le backbone de l’app est **PolyApp API**, que j’ai construite en rétro-ingénierant les appels RPC du site ADE.

Concrètement :  
- Reverse engineering des appels **GWT RPC** du client ADE (login, calendrier, timetable, arbre, recherche)  
- Décodeurs Swift custom pour transformer les payloads RPC bruts en JSON exploitable  
- Exposition d’endpoints propres pour l’app (`/timetable/by-rid`, `/ade/tree`, `/ade/search`, etc.)  
- Cache Redis + validation de cohérence des données planning pour améliorer fiabilité et perfs  
- Mapping des coordonnées planning ADE vers des événements datés (Europe/Paris) lisibles côté iOS

Cette API m’a permis de découpler complètement l’app iOS de la complexité ADE, avec un contrat clair et stable côté mobile, indispensable pour un produit utilisé par plusieurs dizaines d’étudiants.

---

## Défis techniques rencontrés  
- **Reverse protocol** : comprendre et reproduire un flux RPC GWT non documenté  
- **Décodage** : parser des structures RPC compactes/minifiées de manière robuste  
- **Fiabilité** : gérer les incohérences ponctuelles ADE (labels jours/semaine, variations de payload)  
- **Data integrity** : conserver des IDs déterministes pour garder les liens cours ↔ tâches après refresh  
- **Scalabilité produit** : maintenir une expérience stable pour les utilisateurs malgré la dépendance à des services tiers

---

## Ce que j’ai appris  
Ce projet m’a permis de :  
- Concevoir une architecture complète iOS + API backend  
- Structurer une app UIKit modulaire (packages, responsabilités claires, MVVM-C)  
- Industrialiser une intégration reverse-engineered avec cache, observabilité et logique de fallback  
- Construire un produit réellement utile au quotidien pour les étudiants

---

### Liens utiles  
- <a href="https://github.com/lekawik/PolyApp_UIKit/tree/main/PolyApp" target="_blank">PolyApp (iOS)</a>  
- <a href="https://github.com/lekawik/PolyAppApi" target="_blank">PolyApp API (Schedule backbone)</a>  
