// Tests des règles de SPEC.md, exécutés dans le navigateur par tests.html.

import { calculerMarque, donneurSuivant, pointsDonne, valeurContrat } from "../js/regles.js";
import {
	annulerDerniereDonne, choisirDonneur, modifierAnnonce, nouvellePartie, prendre, terminerDonne,
} from "../js/etat.js";

const tests = [];
const test = (nom, fn) => tests.push({ nom, fn });

function egal(obtenu, attendu) {
	const a = JSON.stringify(obtenu);
	const b = JSON.stringify(attendu);
	if (a !== b) throw new Error(`obtenu ${a}, attendu ${b}`);
}

const donne = (preneur, annonce, coinche, resultat, etoile = false) =>
	({ preneur, annonce, coinche, resultat, etoile });

// Joue une donne complète à partir d'un état.
const jouer = (etat, preneur, annonce, coinche, resultat, etoile = false) =>
	terminerDonne(prendre(etat, { preneur, annonce, coinche }), resultat, etoile);

// --- Contrats ---

test("contrat numérique", () => egal(valeurContrat("120"), 120));
test("capot vaut 250", () => egal(valeurContrat("Capot"), 250));
test("générale vaut 500", () => egal(valeurContrat("Générale"), 500));

// --- Points d'une donne ---

test("faite : le preneur marque le contrat", () =>
	egal(pointsDonne(donne("nous", "100", 1, "faite")), { equipe: "nous", points: 100 }));
test("faite coinchée : contrat × 2", () =>
	egal(pointsDonne(donne("eux", "90", 2, "faite")), { equipe: "eux", points: 180 }));
test("faite surcoinchée : contrat × 4", () =>
	egal(pointsDonne(donne("nous", "80", 4, "faite")), { equipe: "nous", points: 320 }));
test("capot fait", () =>
	egal(pointsDonne(donne("eux", "Capot", 1, "faite")), { equipe: "eux", points: 250 }));
test("générale coinchée faite", () =>
	egal(pointsDonne(donne("nous", "Générale", 2, "faite")), { equipe: "nous", points: 1000 }));
test("chutée : la défense marque 160 quel que soit le contrat", () =>
	egal(pointsDonne(donne("nous", "180", 1, "chutee")), { equipe: "eux", points: 160 }));
test("chutée coinchée : 160 × 2", () =>
	egal(pointsDonne(donne("eux", "Capot", 2, "chutee")), { equipe: "nous", points: 320 }));
test("chutée surcoinchée : 160 × 4", () =>
	egal(pointsDonne(donne("nous", "80", 4, "chutee")), { equipe: "eux", points: 640 }));
test("annulée : personne ne marque", () =>
	egal(pointsDonne(donne("nous", "100", 1, "annulee")), null));

// --- Marque d'une partie ---

test("partie vide", () =>
	egal(calculerMarque([]), { manches: [], scores: { nous: 0, eux: 0 }, etoiles: { nous: 0, eux: 0 } }));

test("les scores s'additionnent", () =>
	egal(calculerMarque([
		donne("nous", "100", 1, "faite"),
		donne("eux", "80", 1, "faite"),
		donne("nous", "120", 1, "chutee"),
		donne("eux", "90", 1, "annulee"),
	]).scores, { nous: 100, eux: 240 }));

test("étoile pour l'équipe qui marque (faite)", () =>
	egal(calculerMarque([donne("nous", "100", 1, "faite", true)]).etoiles, { nous: 1, eux: 0 }));
test("étoile pour la défense quand c'est chuté", () =>
	egal(calculerMarque([donne("nous", "100", 1, "chutee", true)]).etoiles, { nous: 0, eux: 1 }));

test("1000 points : manche archivée et scores remis à zéro", () =>
	egal(calculerMarque([
		donne("nous", "Générale", 1, "faite"),
		donne("eux", "100", 1, "faite"),
		donne("nous", "Générale", 1, "faite"),
	]), {
		manches: [{ nous: 1000, eux: 100 }],
		scores: { nous: 0, eux: 0 },
		etoiles: { nous: 0, eux: 0 },
	}));

test("pas de manche sous 1000", () =>
	egal(calculerMarque([donne("eux", "Générale", 1, "faite"), donne("eux", "180", 2, "faite")]).manches, []));

test("plusieurs manches et étoiles cumulées sur la partie", () =>
	egal(calculerMarque([
		donne("nous", "Générale", 2, "faite", true),
		donne("eux", "Générale", 2, "faite", true),
		donne("eux", "100", 1, "faite", true),
	]), {
		manches: [{ nous: 1000, eux: 0 }, { nous: 0, eux: 1000 }],
		scores: { nous: 0, eux: 100 },
		etoiles: { nous: 1, eux: 2 },
	}));

// --- Donneur et déroulement ---

test("le donneur tourne modulo 4", () => {
	egal(donneurSuivant(0), 1);
	egal(donneurSuivant(3), 0);
});

test("le donneur passe au suivant après une donne", () =>
	egal(jouer(nouvellePartie(2), "nous", "100", 1, "faite").donneur, 3));

test("le donneur passe aussi au suivant après une donne annulée", () =>
	egal(jouer(nouvellePartie(3), "nous", "100", 1, "annulee").donneur, 0));

test("la donne enregistre son donneur et l'annonce", () => {
	const etat = jouer(choisirDonneur(nouvellePartie(), 1), "eux", "Capot", 2, "faite", true);
	egal(etat.donnes, [
		{ donneur: 1, preneur: "eux", annonce: "Capot", coinche: 2, resultat: "faite", etoile: true },
	]);
	egal(etat.enCours, null);
});

test("pas d'étoile enregistrée sur une donne annulée", () =>
	egal(jouer(nouvellePartie(), "nous", "100", 1, "annulee", true).donnes[0].etoile, false));

test("modifier l'annonce revient à la phase d'annonce", () => {
	const etat = modifierAnnonce(prendre(nouvellePartie(), { preneur: "nous", annonce: "80", coinche: 1 }));
	egal(etat.enCours, null);
});

test("annuler la dernière donne rend la main à son donneur", () => {
	let etat = nouvellePartie(0);
	etat = jouer(etat, "nous", "100", 1, "faite");
	etat = jouer(etat, "eux", "120", 2, "faite");
	etat = annulerDerniereDonne(etat);
	egal(etat.donneur, 1);
	egal(calculerMarque(etat.donnes).scores, { nous: 100, eux: 0 });
});

test("annuler sans donne ne change rien", () => {
	const etat = nouvellePartie(2);
	egal(annulerDerniereDonne(etat), etat);
});

test("annuler la donne qui fermait une manche rouvre la manche", () => {
	let etat = nouvellePartie();
	etat = jouer(etat, "nous", "Générale", 1, "faite");
	etat = jouer(etat, "nous", "Générale", 1, "faite");
	egal(calculerMarque(etat.donnes).manches.length, 1);
	etat = annulerDerniereDonne(etat);
	egal(calculerMarque(etat.donnes), { manches: [], scores: { nous: 500, eux: 0 }, etoiles: { nous: 0, eux: 0 } });
});

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
