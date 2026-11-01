// État de la partie et transitions (fonctions pures), plus la sauvegarde sur l'appareil.
// La partie est la liste des donnes jouées : la marque est toujours recalculée à partir d'elle.

import { donneurSuivant, equipeDePlace, normaliserInitiales, PLACES } from "./regles.js";

const CLE_STOCKAGE = "marque-coinche";
const VERSION = 1;

// Numéro de table à 4 chiffres, facile à dicter aux autres tables
export function genererTable() {
	return String(Math.floor(Math.random() * 10000)).padStart(4, "0");
}

export const JOUEURS_VIDES = ["", "", "", ""];

// joueurs : initiales dans l'ordre des places (gauche, haut, droite, bas)
export function nouvellePartie(donneur = 0, table = genererTable(), joueurs = JOUEURS_VIDES) {
	return {
		table,
		joueurs: joueurs.map(normaliserInitiales),
		donneur,
		enCours: null, // { joueur, preneur, annonce, couleur, coinche } entre la prise et le résultat
		donnes: [], // { donneur, joueur, preneur, annonce, couleur, coinche, resultat, etoile }
	};
}

export function choisirDonneur(etat, donneur) {
	return { ...etat, donneur };
}

// `joueur` : place (0 à 3) du joueur qui prend ; son équipe est le preneur qui marque les points.
export function prendre(etat, { joueur, preneur = equipeDePlace(joueur), annonce, couleur, coinche }) {
	return { ...etat, enCours: { joueur, preneur, annonce, couleur, coinche } };
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
		...etat,
		donneur: donneurSuivant(etat.donneur),
		enCours: null,
		donnes: [...etat.donnes, donne],
	};
}

export function annulerDerniereDonne(etat) {
	const derniere = etat.donnes.at(-1);
	if (!derniere) return etat;
	return {
		...etat,
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

// Renvoie la partie sauvegardée, ou null s'il n'y en a pas (ou si elle est illisible).
export function charger() {
	try {
		const brut = JSON.parse(localStorage.getItem(CLE_STOCKAGE));
		if (brut?.version === VERSION && estValide(brut.etat)) {
			const etat = brut.etat;
			// Anciennes sauvegardes sans numéro de table ni noms de joueurs
			return {
				...etat,
				table: typeof etat.table === "string" ? etat.table : genererTable(),
				joueurs: Array.isArray(etat.joueurs) && etat.joueurs.length === 4
					? etat.joueurs.map(normaliserInitiales)
					: JOUEURS_VIDES,
			};
		}
	} catch {
		// stockage indisponible ou illisible : pas de partie à reprendre
	}
	return null;
}

export function sauver(etat) {
	try {
		localStorage.setItem(CLE_STOCKAGE, JSON.stringify({ version: VERSION, etat }));
	} catch {
		// navigation privée ou quota dépassé : la partie reste en mémoire
	}
}
