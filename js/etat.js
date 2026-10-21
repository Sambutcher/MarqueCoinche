// État de la partie et transitions (fonctions pures), plus la sauvegarde sur l'appareil.
// La partie est la liste des donnes jouées : la marque est toujours recalculée à partir d'elle.

import { donneurSuivant, PLACES } from "./regles.js";

const CLE_STOCKAGE = "marque-coinche";
const VERSION = 1;

export function nouvellePartie(donneur = 0) {
	return {
		donneur,
		enCours: null, // { preneur, annonce, coinche } entre la prise et le résultat
		donnes: [], // { donneur, preneur, annonce, coinche, resultat, etoile }
	};
}

export function choisirDonneur(etat, donneur) {
	return { ...etat, donneur };
}

export function prendre(etat, { preneur, annonce, coinche }) {
	return { ...etat, enCours: { preneur, annonce, coinche } };
}

export function modifierAnnonce(etat) {
	return { ...etat, enCours: null };
}

export function terminerDonne(etat, resultat, etoile) {
	const donne = {
		donneur: etat.donneur,
		...etat.enCours,
		resultat,
		etoile: resultat !== "annulee" && etoile,
	};
	return {
		donneur: donneurSuivant(etat.donneur),
		enCours: null,
		donnes: [...etat.donnes, donne],
	};
}

export function annulerDerniereDonne(etat) {
	const derniere = etat.donnes.at(-1);
	if (!derniere) return etat;
	return {
		donneur: derniere.donneur,
		enCours: null,
		donnes: etat.donnes.slice(0, -1),
	};
}

// --- Sauvegarde ---

function estValide(etat) {
	return (
		etat &&
		Number.isInteger(etat.donneur) &&
		etat.donneur >= 0 &&
		etat.donneur < PLACES.length &&
		Array.isArray(etat.donnes)
	);
}

export function charger() {
	try {
		const brut = JSON.parse(localStorage.getItem(CLE_STOCKAGE));
		if (brut?.version === VERSION && estValide(brut.etat)) return brut.etat;
	} catch {
		// stockage indisponible ou illisible : on repart d'une partie vierge
	}
	return nouvellePartie();
}

export function sauver(etat) {
	try {
		localStorage.setItem(CLE_STOCKAGE, JSON.stringify({ version: VERSION, etat }));
	} catch {
		// navigation privée ou quota dépassé : la partie reste en mémoire
	}
}
