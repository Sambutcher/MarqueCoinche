// Tests du partage (normalisation des données Firebase) et de la sauvegarde locale.
// Exécutés dans le navigateur par tests.html et sous Node par tests/lancer.mjs.

import { charger, nouvellePartie, sauver } from "../js/etat.js";
import { normaliser } from "../js/partage.js";

const tests = [];
const test = (nom, fn) => tests.push({ nom, fn });

function egal(obtenu, attendu) {
	const a = JSON.stringify(obtenu);
	const b = JSON.stringify(attendu);
	if (a !== b) throw new Error(`obtenu ${a}, attendu ${b}`);
}

// Faux localStorage posé le temps d'un test, puis restauré.
function avecStockage(contenu, fn) {
	const ancien = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
	const magasin = new Map(Object.entries(contenu));
	Object.defineProperty(globalThis, "localStorage", {
		configurable: true,
		value: {
			getItem: (cle) => magasin.get(cle) ?? null,
			setItem: (cle, valeur) => magasin.set(cle, String(valeur)),
		},
	});
	try {
		return fn(magasin);
	} finally {
		if (ancien) Object.defineProperty(globalThis, "localStorage", ancien);
		else delete globalThis.localStorage;
	}
}

const CLE = "marque-coinche";
const sauvegarde = (etat, version = 1) => JSON.stringify({ version, etat });

// --- Données reçues de Firebase (Realtime Database supprime les null et les tableaux vides) ---

test("table inconnue : null", () => egal(normaliser(null), null));

test("table complète", () => {
	const donnes = [{ donneur: 0, preneur: "nous", annonce: "90", coinche: 1, resultat: "faite", etoile: false }];
	const enCours = { joueur: 1, preneur: "nous", annonce: "100", couleur: "coeur", coinche: 1 };
	egal(
		normaliser({ donnes, donneur: 2, en_cours: enCours, joueurs: ["AB", "CD", "EF", "GH"] }),
		{ donnes, donneur: 2, enCours, joueurs: ["AB", "CD", "EF", "GH"] },
	);
});

test("donnes absentes (tableau vide supprimé) : tableau vide", () =>
	egal(normaliser({ donneur: 1, joueurs: ["", "", "", ""] }).donnes, []));

test("en_cours absent (null supprimé) : null", () =>
	egal(normaliser({ donneur: 1, joueurs: ["", "", "", ""] }).enCours, null));

test("donneur 0 conservé", () => egal(normaliser({ donneur: 0, joueurs: ["", "", "", ""] }).donneur, 0));

test("joueurs absents ou invalides : quatre noms vides", () => {
	egal(normaliser({ donneur: 0 }).joueurs, ["", "", "", ""]);
	egal(normaliser({ donneur: 0, joueurs: "AB" }).joueurs, ["", "", "", ""]);
});

// --- Sauvegarde sur l'appareil ---

test("sauver puis charger redonne la partie", () =>
	avecStockage({}, () => {
		const etat = nouvellePartie(2, "1234", ["AB", "CD", "EF", "GH"]);
		sauver(etat);
		egal(charger(), etat);
	}));

test("aucune sauvegarde : null", () => avecStockage({}, () => egal(charger(), null)));

test("JSON illisible : null", () => avecStockage({ [CLE]: "{pas du json" }, () => egal(charger(), null)));

test("mauvaise version : null", () =>
	avecStockage({ [CLE]: sauvegarde({ donneur: 0, donnes: [] }, 99) }, () => egal(charger(), null)));

test("donneur hors de 0 à 3 : null", () =>
	avecStockage({ [CLE]: sauvegarde({ donneur: 4, donnes: [] }) }, () => egal(charger(), null)));

test("ancienne sauvegarde sans table ni joueurs : migrée", () =>
	avecStockage({ [CLE]: sauvegarde({ donneur: 1, enCours: null, donnes: [] }) }, () => {
		const etat = charger();
		if (!/^\d{4}$/.test(etat.table)) throw new Error(`table ${etat.table}`);
		egal(etat.joueurs, ["", "", "", ""]);
		egal(etat.donneur, 1);
	}));

test("les initiales d'une sauvegarde sont renormalisées", () =>
	avecStockage({ [CLE]: sauvegarde({ donneur: 0, donnes: [], table: "0001", joueurs: ["abcd", "x", "", ""] }) }, () =>
		egal(charger().joueurs, ["ABC", "X", "", ""])));

// --- Exécution ---

export function lancerTests() {
	return tests.map(({ nom, fn }) => {
		try {
			fn();
			return { nom, ok: true };
		} catch (e) {
			return { nom, ok: false, erreur: e.message };
		}
	});
}
