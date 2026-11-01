// Affichage et gestion des contrôles. Toute modification passe par `appliquer`,
// qui sauvegarde l'état puis redessine l'écran.

import {
	ANNONCES, COINCHES, COULEURS, COULEURS_SPECIALES, calculerMarque, couleurAutorisee, nomEquipe, nomPlace,
	normaliserInitiales, pointsDonne, surnomsAleatoires, symboleCouleur,
} from "./regles.js";
import {
	annulerDerniereDonne, charger, choisirDonneur, genererTable, modifierAnnonce, nouvellePartie, prendre,
	sauver, terminerDonne,
} from "./etat.js";
import { lire, partageDisponible, publier, tableLibre } from "./partage.js";

const $ = (id) => document.getElementById(id);

const NOMS_RESULTATS = { faite: "Faite", chutee: "Chutée", annulee: "Annulée" };

const DELAI_PUBLICATION = 500; // regroupe les clics rapprochés en un seul envoi
const DELAI_RAFRAICHISSEMENT = 5000;

let etat = null;
let ecran = "accueil";
let minuteurPublication = null;
let minuteurScores = null;
let nouvelleTable = null; // { code, verification } pour la partie en préparation
let tableSuivie = null; // numéro de la table affichée dans l'écran des scores
// Choix en cours dans la phase d'annonce, pas encore validés
let brouillon = brouillonVide();
let etoile = false;

function brouillonVide() {
	return { annonce: null, couleur: null, coinche: 1 };
}

function appliquer(nouvelEtat) {
	etat = nouvelEtat;
	sauver(etat);
	programmerPublication();
	afficher();
}

function programmerPublication() {
	clearTimeout(minuteurPublication);
	minuteurPublication = setTimeout(() => publier(etat), DELAI_PUBLICATION);
}

// --- Écrans ---

function montrer(nom) {
	ecran = nom;
	clearInterval(minuteurScores);
	minuteurScores = null;
	for (const id of ["accueil", "table", "partie", "scores"]) $(`ecran-${id}`).hidden = id !== nom;
	if (nom === "accueil") $("accueil-reprendre").disabled = etat === null;
	if (nom === "table") {
		const surnoms = surnomsAleatoires(4);
		for (const champ of document.querySelectorAll("[data-place]")) champ.value = surnoms[Number(champ.dataset.place)];
		preparerTable();
	}
	if (nom === "partie") {
		afficher();
		afficherAnnonce();
	}
}

function libelleCoinche(coinche) {
	return COINCHES.find((c) => c.valeur === coinche).nom;
}

// Le preneur est un joueur ; les donnes saisies avant ce changement n'ont que l'équipe.
function libelleAnnonce({ joueur, preneur, annonce, couleur, coinche }, joueurs) {
	const qui = Number.isInteger(joueur) ? nomPlace(joueurs, joueur) : nomEquipe(joueurs, preneur);
	const coinchage = coinche > 1 ? ` ${libelleCoinche(coinche).toLowerCase()}` : "";
	const atout = symboleCouleur(couleur); // vide pour les donnes saisies avant l'ajout des couleurs
	return `${qui} · ${annonce}${atout ? ` ${atout}` : ""}${coinchage}`;
}

// --- Construction des boutons ---

function creerChoix(texte, attributs) {
	const bouton = document.createElement("button");
	bouton.type = "button";
	bouton.className = "choix";
	bouton.textContent = texte;
	bouton.setAttribute("role", "radio");
	for (const [cle, valeur] of Object.entries(attributs)) bouton.dataset[cle] = valeur;
	return bouton;
}

function construireControles() {
	$("contrats").append(...ANNONCES.map((annonce) => {
		const bouton = creerChoix(annonce, { annonce });
		if (Number.isNaN(Number(annonce))) bouton.classList.add("choix-large");
		return bouton;
	}));
	$("couleurs").append(...[...COULEURS, ...COULEURS_SPECIALES].map(({ id, symbole, nom }) => {
		const bouton = creerChoix(symbole, { couleur: id });
		bouton.setAttribute("aria-label", nom);
		if (COULEURS.some((c) => c.id === id) === false) bouton.classList.add("choix-special");
		else if (id === "coeur" || id === "carreau") bouton.classList.add("choix-rouge");
		return bouton;
	}));
	$("coinches").append(...COINCHES.map(({ valeur, nom }) => creerChoix(nom, { coinche: valeur })));
}

// --- Affichage ---

// Noms d'équipes (initiales des joueurs) dans les titres de la marque
function afficherNoms(joueurs, prefixe = "") {
	for (const equipe of ["nous", "eux"]) $(`${prefixe}titre-${equipe}`).textContent = nomEquipe(joueurs, equipe);
}

function afficherMarque(donnes, prefixe = "") {
	const { manches, scores, etoiles } = calculerMarque(donnes);
	for (const equipe of ["nous", "eux"]) {
		$(`${prefixe}manches-${equipe}`).replaceChildren(...manches.map((manche) => {
			const li = document.createElement("li");
			li.textContent = manche[equipe];
			if (manche[equipe] > manche[equipe === "nous" ? "eux" : "nous"]) li.className = "gagnee";
			return li;
		}));
		$(`${prefixe}score-${equipe}`).textContent = scores[equipe];
		$(`${prefixe}etoiles-${equipe}`).textContent = "★".repeat(etoiles[equipe]);
	}
}

function afficherAnnonce() {
	for (const place of document.querySelectorAll("[data-donneur]")) {
		place.textContent = nomPlace(etat.joueurs, Number(place.dataset.donneur));
		place.setAttribute("aria-checked", Number(place.dataset.donneur) === etat.donneur);
	}
	for (const bouton of document.querySelectorAll("[data-annonce]")) {
		bouton.setAttribute("aria-checked", bouton.dataset.annonce === brouillon.annonce);
	}
	for (const bouton of document.querySelectorAll("[data-couleur]")) {
		const id = bouton.dataset.couleur;
		bouton.setAttribute("aria-checked", id === brouillon.couleur);
		bouton.disabled = brouillon.annonce === null || !couleurAutorisee(brouillon.annonce, id);
	}
	for (const bouton of document.querySelectorAll("[data-coinche]")) {
		bouton.setAttribute("aria-checked", Number(bouton.dataset.coinche) === brouillon.coinche);
		bouton.disabled = brouillon.couleur === null; // la coinche se choisit après la couleur
	}
	for (const bouton of document.querySelectorAll("[data-joueur]")) {
		bouton.textContent = nomPlace(etat.joueurs, Number(bouton.dataset.joueur));
		bouton.disabled = brouillon.annonce === null || brouillon.couleur === null;
	}
}

function afficherResultat() {
	const recap = $("recap");
	recap.textContent = libelleAnnonce(etat.enCours, etat.joueurs);
	const detail = document.createElement("small");
	detail.textContent = `Donneur ${nomPlace(etat.joueurs, etat.donneur)}`;
	recap.append(detail);
	$("etoile").setAttribute("aria-pressed", etoile);
}

function afficherHistorique() {
	const liste = $("liste-donnes");
	const n = etat.donnes.length;
	$("historique").querySelector("summary").textContent =
		n ? `Historique · ${n} donne${n > 1 ? "s" : ""}` : "Historique";

	if (!n) {
		const vide = document.createElement("li");
		vide.className = "vide";
		vide.textContent = "Aucune donne jouée.";
		liste.replaceChildren(vide);
		return;
	}

	liste.replaceChildren(...etat.donnes.map((donne) => {
		const li = document.createElement("li");
		const marque = pointsDonne(donne);
		const points = document.createElement("span");
		points.className = "points";
		points.textContent = marque ? `${nomEquipe(etat.joueurs, marque.equipe)} +${marque.points}` : "—";
		li.append(
			points,
			`${nomPlace(etat.joueurs, donne.donneur)} ${libelleAnnonce(donne, etat.joueurs)} · ${NOMS_RESULTATS[donne.resultat]}`,
			donne.etoile ? " ★" : "",
		);
		return li;
	}).reverse());
}

function afficher() {
	if (!etat) return;
	$("table-numero").textContent = `Table n° ${etat.table}`;
	const enAnnonce = etat.enCours === null;
	$("phase-annonce").hidden = !enAnnonce;
	$("phase-resultat").hidden = enAnnonce;
	if (enAnnonce) afficherAnnonce();
	else afficherResultat();

	afficherNoms(etat.joueurs);
	afficherMarque(etat.donnes);
	afficherHistorique();
	$("annuler-donne").disabled = etat.donnes.length === 0;
}

// --- Actions ---

function brancherActions() {
	$("donneurs").addEventListener("click", (e) => {
		const place = e.target.closest("[data-donneur]");
		if (place) appliquer(choisirDonneur(etat, Number(place.dataset.donneur)));
	});

	$("contrats").addEventListener("click", (e) => {
		const bouton = e.target.closest("[data-annonce]");
		if (!bouton) return;
		brouillon.annonce = bouton.dataset.annonce;
		// SA et TA ne vont qu'avec Capot ou Générale
		if (brouillon.couleur && !couleurAutorisee(brouillon.annonce, brouillon.couleur)) brouillon.couleur = null;
		afficherAnnonce();
	});

	$("couleurs").addEventListener("click", (e) => {
		const bouton = e.target.closest("[data-couleur]");
		if (!bouton || bouton.disabled) return;
		brouillon.couleur = bouton.dataset.couleur;
		afficherAnnonce();
	});

	$("coinches").addEventListener("click", (e) => {
		const bouton = e.target.closest("[data-coinche]");
		if (!bouton || bouton.disabled) return;
		brouillon.coinche = Number(bouton.dataset.coinche);
		afficherAnnonce();
	});

	for (const bouton of document.querySelectorAll("[data-joueur]")) {
		bouton.addEventListener("click", () => {
			if (brouillon.annonce === null || brouillon.couleur === null) return;
			etoile = false;
			appliquer(prendre(etat, { joueur: Number(bouton.dataset.joueur), ...brouillon }));
		});
	}

	$("etoile").addEventListener("click", () => {
		etoile = !etoile;
		afficherResultat();
	});

	for (const bouton of document.querySelectorAll("[data-resultat]")) {
		bouton.addEventListener("click", () => {
			brouillon = brouillonVide();
			appliquer(terminerDonne(etat, bouton.dataset.resultat, etoile));
		});
	}

	$("modifier").addEventListener("click", () => {
		const { annonce, couleur = null, coinche } = etat.enCours;
		brouillon = { annonce, couleur, coinche };
		appliquer(modifierAnnonce(etat));
	});

	$("annuler-donne").addEventListener("click", () => {
		const derniere = etat.donnes.at(-1);
		if (!derniere) return;
		const description = `${libelleAnnonce(derniere, etat.joueurs)} · ${NOMS_RESULTATS[derniere.resultat]}`;
		if (!confirm(`Annuler la dernière donne ?\n${description}`)) return;
		brouillon = brouillonVide();
		appliquer(annulerDerniereDonne(etat));
	});

	$("retour-accueil").addEventListener("click", () => montrer("accueil"));
}

// Le numéro de table est tiré dès l'ouverture de l'écran des joueurs, puis vérifié en ligne
// (changé s'il est déjà pris).
function preparerTable() {
	const prepa = { code: genererTable() };
	let premier = true;
	prepa.verification = tableLibre(() => (premier ? ((premier = false), prepa.code) : genererTable())).then((code) => {
		prepa.code = code;
		if (nouvelleTable === prepa) $("titre-table").textContent = `Table n° ${code}`;
	});
	nouvelleTable = prepa;
	$("titre-table").textContent = `Table n° ${prepa.code}`;
}

// --- Accueil ---

function brancherAccueil() {
	$("accueil-nouvelle").addEventListener("click", () => {
		if (etat?.donnes.length && !confirm("Commencer une nouvelle partie ? Les scores de la partie en cours seront effacés.")) return;
		montrer("table");
	});

	for (const champ of document.querySelectorAll("[data-place]")) {
		champ.addEventListener("input", () => { champ.value = normaliserInitiales(champ.value); });
		champ.addEventListener("focus", () => champ.select());
	}

	$("table-retour").addEventListener("click", () => montrer("accueil"));

	$("form-table").addEventListener("submit", async (e) => {
		e.preventDefault();
		const joueurs = ["", "", "", ""];
		for (const champ of document.querySelectorAll("[data-place]")) joueurs[Number(champ.dataset.place)] = champ.value;
		brouillon = brouillonVide();
		etoile = false;
		const bouton = $("form-table").querySelector("[type=submit]"); // e.submitter est null si le formulaire est soumis sans bouton
		bouton.disabled = true;
		const prepa = nouvelleTable;
		await prepa.verification;
		bouton.disabled = false;
		appliquer(nouvellePartie(etat?.donneur ?? 0, prepa.code, joueurs));
		montrer("partie");
	});

	$("accueil-reprendre").addEventListener("click", () => {
		if (!etat) return;
		publier(etat); // remet la table en ligne si elle n'avait pas pu être envoyée
		montrer("partie");
	});
}

// --- Scores d'une autre table ---

function libelleContrat(enCours, joueurs) {
	return enCours ? libelleAnnonce(enCours, joueurs) : "Aucun";
}

async function actualiserScores() {
	const code = tableSuivie;
	const message = $("message-scores");
	try {
		const table = await lire(code);
		if (code !== tableSuivie || ecran !== "scores") return; // l'utilisateur a changé entre-temps
		if (!table) {
			message.textContent = "Table introuvable.";
			$("resultat-scores").hidden = true;
			return;
		}
		message.textContent = "";
		afficherNoms(table.joueurs, "lect-");
		afficherMarque(table.donnes, "lect-");
		$("lect-contrat").textContent = libelleContrat(table.enCours, table.joueurs);
		$("resultat-scores").hidden = false;
	} catch {
		if (code !== tableSuivie || ecran !== "scores") return;
		message.textContent = partageDisponible()
			? "Pas de connexion : dernières valeurs affichées."
			: "Le partage des scores n'est pas configuré.";
	}
}

// Le numéro de table est saisi sur l'accueil ; l'écran des scores l'affiche en lecture seule.
function brancherScores() {
	$("form-scores").addEventListener("submit", (e) => {
		e.preventDefault();
		const code = $("numero-table").value.trim();
		if (!/^\d{4}$/.test(code)) {
			$("message-accueil").textContent = "Le numéro de table a 4 chiffres.";
			return;
		}
		$("message-accueil").textContent = "";
		tableSuivie = code;
		montrer("scores");
		$("titre-scores").textContent = `Table n° ${code}`;
		$("message-scores").textContent = "";
		$("resultat-scores").hidden = true;
		actualiserScores();
		minuteurScores = setInterval(actualiserScores, DELAI_RAFRAICHISSEMENT);
	});

	$("scores-retour").addEventListener("click", () => montrer("accueil"));
}

export function demarrer() {
	etat = charger();
	construireControles();
	brancherActions();
	brancherAccueil();
	brancherScores();
	montrer("accueil");
}
