// Tests des règles de SPEC.md, exécutés dans le navigateur par tests.html.

import {
	SURNOMS, calculerMarque, couleurAutorisee, donneurSuivant, nomEquipe, nomPlace, normaliserInitiales, pointsDonne,
	equipeDePlace, surnomsAleatoires, valeurContrat,
} from "../js/regles.js";
import {
	annulerDerniereDonne, choisirDonneur, genererTable, modifierAnnonce, nouvellePartie, prendre,
	terminerDonne,
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

// --- Couleur d'atout ---

test("SA et TA réservés à Capot et Générale", () => {
	egal(couleurAutorisee("120", "SA"), false);
	egal(couleurAutorisee("180", "TA"), false);
	egal(couleurAutorisee("Capot", "SA"), true);
	egal(couleurAutorisee("Générale", "TA"), true);
});

test("les quatre couleurs sont toujours autorisées", () => {
	for (const c of ["pique", "coeur", "carreau", "trefle"]) egal(couleurAutorisee("80", c), true);
	egal(couleurAutorisee("80", "violet"), false);
});

test("la couleur est conservée dans la donne et sans effet sur les points", () => {
	const etat = jouer(nouvellePartie(), "nous", "100", 1, "faite");
	egal(pointsDonne(etat.donnes[0]), { equipe: "nous", points: 100 });
	const avec = terminerDonne(prendre(nouvellePartie(), { preneur: "nous", annonce: "Capot", couleur: "SA", coinche: 1 }), "faite", false);
	egal(avec.donnes[0].couleur, "SA");
	egal(pointsDonne(avec.donnes[0]), { equipe: "nous", points: 250 });
});

// --- Joueurs ---

const joueurs = ["GAU", "HAU", "DRO", "BAS"]; // gauche, haut, droite, bas

test("initiales normalisées : majuscules, sans espaces, 3 lettres", () => {
	egal(normaliserInitiales(" ab c d"), "ABC");
	egal(normaliserInitiales("maxime"), "MAX");
	egal(normaliserInitiales(undefined), "");
});

test("la place affiche les initiales, sinon la flèche", () => {
	egal(nomPlace(joueurs, 1), "HAU");
	egal(nomPlace(["", "", "", ""], 1), "↑");
	egal(nomPlace(undefined, 3), "↓");
});

test("Nous = haut + bas, Eux = gauche + droite", () => {
	egal(nomEquipe(joueurs, "nous"), "HAU / BAS");
	egal(nomEquipe(joueurs, "eux"), "GAU / DRO");
});

test("équipe sans initiales ou avec une seule", () => {
	egal(nomEquipe(["", "", "", ""], "nous"), "Nous");
	egal(nomEquipe(["", "", "", ""], "eux"), "Eux");
	egal(nomEquipe(["A", "", "", ""], "eux"), "A");
});

test("le tour des donneurs suit le sens des aiguilles d'une montre", () => {
	// gauche (0) -> haut (1) -> droite (2) -> bas (3) -> gauche
	egal([0, 1, 2, 3].map(donneurSuivant), [1, 2, 3, 0]);
});

test("quatre surnoms aléatoires distincts de 3 lettres au plus", () => {
	for (let i = 0; i < 50; i++) {
		const s = surnomsAleatoires(4);
		egal(new Set(s).size, 4);
		for (const nom of s) {
			if (!SURNOMS.includes(nom) || nom.length > 3) throw new Error(`surnom invalide : ${nom}`);
		}
	}
});

test("les surnoms ne sont pas toujours les mêmes", () => {
	const tirages = new Set(Array.from({ length: 20 }, () => surnomsAleatoires(4).join()));
	if (tirages.size < 2) throw new Error("tirage constant");
});

test("une partie garde les joueurs saisis, normalisés", () => {
	let etat = nouvellePartie(0, "1234", ["ab", " cd ", "efgh", "ij"]);
	egal(etat.joueurs, ["AB", "CD", "EFG", "IJ"]);
	etat = jouer(etat, "nous", "100", 1, "faite");
	egal(etat.joueurs, ["AB", "CD", "EFG", "IJ"]);
	egal(annulerDerniereDonne(etat).joueurs, ["AB", "CD", "EFG", "IJ"]);
});

test("une partie sans joueurs a quatre places vides", () => {
	egal(nouvellePartie().joueurs, ["", "", "", ""]);
});

// --- Preneur ---

test("l'équipe d'une place : haut et bas = Nous, gauche et droite = Eux", () => {
	egal([0, 1, 2, 3].map(equipeDePlace), ["eux", "nous", "eux", "nous"]);
});

test("le joueur qui prend détermine l'équipe qui marque", () => {
	let etat = prendre(nouvellePartie(), { joueur: 0, annonce: "100", couleur: "pique", coinche: 1 });
	egal(etat.enCours.preneur, "eux");
	egal(etat.enCours.joueur, 0);
	etat = terminerDonne(etat, "faite", false);
	egal(pointsDonne(etat.donnes[0]), { equipe: "eux", points: 100 });
	etat = terminerDonne(prendre(etat, { joueur: 3, annonce: "80", couleur: "coeur", coinche: 1 }), "chutee", false);
	egal(pointsDonne(etat.donnes[1]), { equipe: "eux", points: 160 });
});

// --- Numéro de table ---

test("une nouvelle partie reçoit un numéro de table à 4 chiffres", () => {
	for (let i = 0; i < 50; i++) {
		if (!/^\d{4}$/.test(genererTable())) throw new Error("format invalide");
	}
	if (!/^\d{4}$/.test(nouvellePartie().table)) throw new Error("table absente");
});

test("le numéro de table est conservé pendant la partie", () => {
	let etat = nouvellePartie(0, "4242");
	etat = jouer(etat, "nous", "100", 1, "faite");
	egal(etat.table, "4242");
	egal(annulerDerniereDonne(etat).table, "4242");
	egal(prendre(etat, { preneur: "eux", annonce: "80", coinche: 1 }).table, "4242");
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
