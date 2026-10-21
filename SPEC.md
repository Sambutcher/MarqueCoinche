# Marque de Coinche — spécification

Ce document décrit les règles de marque appliquées par l'application. Elles reprennent
le comportement de la première version (`main.js` d'origine, jusqu'au commit `cdcaaca`)
et servent de référence aux tests (`tests.html`).

## Équipes et donneur

- Deux équipes : **Nous** et **Eux**.
- Quatre places autour de la table, numérotées 0 à 3 et affichées ← ↑ → ↓.
- Le donneur peut être choisi librement pendant l'annonce.
- À la fin de chaque donne, **y compris une donne annulée**, le donneur passe à la place
  suivante (modulo 4).

## Annonce

- Contrats : 80 à 180 de 10 en 10, **Capot** (vaut 250) et **Générale** (vaut 500).
- Coinche : non coinché ×1, coinché ×2, surcoinché ×4.
- L'équipe preneuse est validée par « Nous » ou « Eux ». Sans contrat choisi, la
  validation est impossible.

## Résultat de la donne

| Résultat | Équipe qui marque | Points |
|---|---|---|
| Faite | le preneur | contrat × coinche |
| Chutée | la défense | 160 × coinche |
| Annulée | personne | 0 |

- **Étoile** : si la case est cochée, l'équipe qui marque gagne une étoile. Les étoiles
  se cumulent sur toute la partie (elles ne repartent pas à zéro avec une nouvelle
  manche) et s'affichent en `*` après le score. Une donne annulée ne donne pas d'étoile.

## Manches

- Après chaque donne, si une équipe atteint **1000 points ou plus**, les deux scores sont
  archivés comme une manche et repartent à 0.
- Les manches terminées s'affichent au-dessus du score en cours.

## Ajouts de la refonte

- La partie (donnes jouées, donneur, annonce en cours) est sauvegardée sur l'appareil.
- **Annuler la dernière donne** retire la dernière donne jouée et rend la main à son
  donneur ; le score est recalculé.
- **Historique** : liste des donnes jouées (donneur, preneur, contrat, coinche, résultat,
  étoile, points).
- **Nouvelle partie** remet tout à zéro après confirmation.
