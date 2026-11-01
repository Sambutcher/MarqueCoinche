// Règles de marque de la coinche : fonctions pures, sans DOM (voir SPEC.md).

export const EQUIPES = ["nous", "eux"];
export const NOMS_EQUIPES = { nous: "Nous", eux: "Eux" };

export const PLACES = ["←", "↑", "→", "↓"];

// Équipes : Nous = haut + bas, Eux = gauche + droite (indices de PLACES, dans le sens des aiguilles d'une montre)
export const PLACES_EQUIPE = { nous: [1, 3], eux: [0, 2] };

export const SURNOMS = [
	"MAX", "JOE", "TOM", "LOU", "ZOE", "TOT", "RIR", "BOB", "LIL", "PAT", "MIM", "FIF", "ZIZ", "PEP",
	"NAN", "DOD", "LOL", "MOU", "KIK", "GUS", "RAY", "BEN", "TIM", "NIN", "COC", "DUD", "POP", "JOJ",
	"MEM", "LEO", "NOU", "TAT", "ROB", "FRI", "BIB", "CHO", "GIG", "YOY", "SAM", "ZAZ",
];

// Tire n surnoms différents ; `hasard` est injectable pour les tests.
export function surnomsAleatoires(n = 4, hasard = Math.random) {
	const reste = [...SURNOMS];
	const tires = [];
	while (tires.length < n && reste.length) {
		tires.push(reste.splice(Math.floor(hasard() * reste.length), 1)[0]);
	}
	return tires;
}

// Majuscules, sans espaces, 3 caractères au plus.
export function normaliserInitiales(texte) {
	return String(texte ?? "").replace(/\s/g, "").toUpperCase().slice(0, 3);
}

// Équipe d'une place (0 à 3)
export const equipeDePlace = (place) => (PLACES_EQUIPE.nous.includes(place) ? "nous" : "eux");

// Initiales de la place, ou la flèche si elles ne sont pas renseignées.
export function nomPlace(joueurs, place) {
	return normaliserInitiales(joueurs?.[place]) || PLACES[place];
}

// « AB / CD », ou « Nous » / « Eux » si aucune initiale.
export function nomEquipe(joueurs, equipe) {
	const initiales = PLACES_EQUIPE[equipe].map((p) => normaliserInitiales(joueurs?.[p])).filter(Boolean);
	return initiales.length ? initiales.join(" / ") : NOMS_EQUIPES[equipe];
}

export const ANNONCES = [
	"80", "90", "100", "110", "120", "130", "140", "150", "160", "170", "180",
	"Capot", "Générale",
];

// Couleurs d'atout. SA (sans atout) et TA (tout atout) ne se jouent qu'avec Capot ou Générale.
export const COULEURS = [
	{ id: "pique", symbole: "♠", nom: "Pique" },
	{ id: "coeur", symbole: "♥", nom: "Cœur" },
	{ id: "carreau", symbole: "♦", nom: "Carreau" },
	{ id: "trefle", symbole: "♣", nom: "Trèfle" },
];
export const COULEURS_SPECIALES = [
	{ id: "SA", symbole: "SA", nom: "Sans atout" },
	{ id: "TA", symbole: "TA", nom: "Tout atout" },
];

export const estAnnonceSpeciale = (annonce) => annonce === "Capot" || annonce === "Générale";

export function couleurAutorisee(annonce, couleur) {
	if (COULEURS.some((c) => c.id === couleur)) return true;
	return COULEURS_SPECIALES.some((c) => c.id === couleur) && estAnnonceSpeciale(annonce);
}

export function symboleCouleur(couleur) {
	return [...COULEURS, ...COULEURS_SPECIALES].find((c) => c.id === couleur)?.symbole ?? "";
}

export const COINCHES = [
	{ valeur: 1, nom: "Non coinché" },
	{ valeur: 2, nom: "Coinché" },
	{ valeur: 4, nom: "Surcoinché" },
];

export const RESULTATS = ["faite", "chutee", "annulee"];

export const POINTS_CHUTE = 160;
export const FIN_MANCHE = 1000;

export function valeurContrat(annonce) {
	if (annonce === "Capot") return 250;
	if (annonce === "Générale") return 500;
	return Number(annonce);
}

export function adversaire(equipe) {
	return equipe === "nous" ? "eux" : "nous";
}

export function donneurSuivant(donneur) {
	return (donneur + 1) % PLACES.length;
}

// Équipe qui marque et nombre de points pour une donne, ou null si personne ne marque.
// donne : { preneur, annonce, coinche, resultat }
export function pointsDonne(donne) {
	switch (donne.resultat) {
		case "faite":
			return { equipe: donne.preneur, points: valeurContrat(donne.annonce) * donne.coinche };
		case "chutee":
			return { equipe: adversaire(donne.preneur), points: POINTS_CHUTE * donne.coinche };
		default:
			return null;
	}
}

// Rejoue toutes les donnes et renvoie l'état de la marque.
export function calculerMarque(donnes) {
	const manches = [];
	let scores = { nous: 0, eux: 0 };
	const etoiles = { nous: 0, eux: 0 };

	for (const donne of donnes) {
		const marque = pointsDonne(donne);
		if (!marque) continue;

		scores[marque.equipe] += marque.points;
		if (donne.etoile) etoiles[marque.equipe]++;

		if (scores.nous >= FIN_MANCHE || scores.eux >= FIN_MANCHE) {
			manches.push(scores);
			scores = { nous: 0, eux: 0 };
		}
	}

	return { manches, scores, etoiles };
}
