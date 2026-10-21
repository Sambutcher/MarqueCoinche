// Règles de marque de la coinche : fonctions pures, sans DOM (voir SPEC.md).

export const EQUIPES = ["nous", "eux"];
export const NOMS_EQUIPES = { nous: "Nous", eux: "Eux" };

export const PLACES = ["←", "↑", "→", "↓"];

export const ANNONCES = [
	"80", "90", "100", "110", "120", "130", "140", "150", "160", "170", "180",
	"Capot", "Générale",
];

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
