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
- **Couleur d'atout** obligatoire : ♠ ♥ ♦ ♣, ou **SA** (sans atout) / **TA** (tout atout),
  ces deux dernières n'étant proposées que pour **Capot** ou **Générale**. Changer pour un
  contrat chiffré efface un SA/TA déjà choisi. La couleur n'influe pas sur les points ; les
  donnes saisies avant cet ajout n'en ont pas et s'affichent sans couleur.
- Coinche : non coinché ×1, coinché ×2, surcoinché ×4.
- Le **joueur qui prend** est choisi parmi les 4 (boutons aux initiales) ; son équipe est
  l'équipe preneuse. La validation est impossible sans contrat ni couleur. Les donnes
  saisies avant ce changement n'ont que l'équipe et s'affichent comme avant.

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

## Joueurs

- À chaque nouvelle partie, une table dessinée demande les **initiales** (3 lettres max,
  majuscules) des 4 joueurs. Les champs arrivent pré-remplis de surnoms aléatoires
  (MAX, JOE…) à remplacer ; ils ne reprennent pas la partie précédente.
- **Nous** = haut + bas, **Eux** = gauche + droite. Les places, dans l'ordre des indices :
  gauche (0), haut (1), droite (2), bas (3) ; le tour va dans le sens des aiguilles d'une montre.
- Les initiales remplacent les flèches du donneur et les mots « Nous » / « Eux »
  (équipe affichée « AB / CD »). Une place laissée vide garde la flèche ; une équipe sans
  initiales garde « Nous » / « Eux ».
- Les noms sont sauvegardés avec la partie et publiés avec elle (colonne `joueurs`).

## Accueil et tables partagées

- L'application s'ouvre sur un **accueil** : *Nouvelle partie*, *Reprendre la partie*,
  *Afficher les scores*. Un bouton **Accueil** dans la partie y ramène sans rien effacer.
- **Nouvelle partie** remet tout à zéro (après confirmation s'il y a des donnes) et génère un
  **numéro de table** à 4 chiffres, affiché en haut de la partie. Le numéro est conservé jusqu'à
  la prochaine nouvelle partie.
- **Reprendre la partie** revient sur la dernière partie sauvegardée (désactivé sans sauvegarde).
- **Afficher les scores** : le numéro d'une autre table se saisit sur l'accueil ; l'écran des
  scores l'affiche en lecture seule (pour en changer, retour à l'accueil) avec sa marque et le
  contrat en cours (ou « Aucun »), rafraîchis toutes les 5 s. Lecture seule.
- Le partage passe par Supabase (`js/partage.js`, schéma dans `supabase.sql`) : chaque
  modification de la partie publie `{ code, donnes, donneur, en_cours }`. Hors connexion, la partie
  continue en local et la table se resynchronise à la modification suivante.
- Tout le monde connaissant le numéro peut lire la table : ne sont publiées que des données de jeu.

## Affichage sur téléphone

- Pas de zoom (viewport verrouillé, pincement et double toucher bloqués) et **pas de défilement** :
  chaque écran tient dans la hauteur visible, les hauteurs de boutons suivent la hauteur de l'écran.
- **Paysage** : deux colonnes (marque et outils à gauche, saisie ou résultat à droite ; sur
  l'accueil, menu et recherche côte à côte). Vérifié de 375×560 (portrait) à 780×360 (paysage).
- L'**historique** s'ouvre en plein écran et défile à l'intérieur ; « Fermer » le referme.
- Les manches terminées s'alignent en ligne et passent à la ligne au lieu d'allonger la page.
