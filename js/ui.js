// Affichage et gestion des contrôles. Toute modification passe par `appliquer`,
// qui sauvegarde l'état puis redessine l'écran.

import {
	ANNONCES, COINCHES, NOMS_EQUIPES, PLACES, calculerMarque, pointsDonne,
} from "./regles.js";
import {
	annulerDerniereDonne, charger, choisirDonneur, modifierAnnonce, nouvellePartie, prendre, sauver,
	terminerDonne,
} from "./etat.js";

const $ = (id) => document.getElementById(id);

const NOMS_RESULTATS = { faite: "Faite", chutee: "Chutée", annulee: "Annulée" };

let etat;
// Choix en cours dans la phase d'annonce, pas encore validés
let brouillon = { annonce: null, coinche: 1 };
let etoile = false;

function appliquer(nouvelEtat) {
	etat = nouvelEtat;
	sauver(etat);
	afficher();
}

function libelleCoinche(coinche) {
	return COINCHES.find((c) => c.valeur === coinche).nom;
}

function libelleAnnonce({ preneur, annonce, coinche }) {
	const coinchage = coinche > 1 ? ` ${libelleCoinche(coinche).toLowerCase()}` : "";
	return `${NOMS_EQUIPES[preneur]} · ${annonce}${coinchage}`;
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
	$("coinches").append(...COINCHES.map(({ valeur, nom }) => creerChoix(nom, { coinche: valeur })));
}

// --- Affichage ---

function afficherMarque() {
	const { manches, scores, etoiles } = calculerMarque(etat.donnes);
	for (const equipe of ["nous", "eux"]) {
		$(`manches-${equipe}`).replaceChildren(...manches.map((manche) => {
			const li = document.createElement("li");
			li.textContent = manche[equipe];
			if (manche[equipe] > manche[equipe === "nous" ? "eux" : "nous"]) li.className = "gagnee";
			return li;
		}));
		$(`score-${equipe}`).textContent = scores[equipe];
		$(`etoiles-${equipe}`).textContent = "★".repeat(etoiles[equipe]);
	}
}

function afficherAnnonce() {
	for (const place of document.querySelectorAll("[data-donneur]")) {
		place.setAttribute("aria-checked", Number(place.dataset.donneur) === etat.donneur);
	}
	for (const bouton of document.querySelectorAll("[data-annonce]")) {
		bouton.setAttribute("aria-checked", bouton.dataset.annonce === brouillon.annonce);
	}
	for (const bouton of document.querySelectorAll("[data-coinche]")) {
		bouton.setAttribute("aria-checked", Number(bouton.dataset.coinche) === brouillon.coinche);
	}
	for (const bouton of document.querySelectorAll("[data-preneur]")) {
		bouton.disabled = brouillon.annonce === null;
	}
}

function afficherResultat() {
	const recap = $("recap");
	recap.textContent = libelleAnnonce(etat.enCours);
	const detail = document.createElement("small");
	detail.textContent = `Donneur ${PLACES[etat.donneur]}`;
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
		points.textContent = marque ? `${NOMS_EQUIPES[marque.equipe]} +${marque.points}` : "—";
		li.append(
			points,
			`${PLACES[donne.donneur]} ${libelleAnnonce(donne)} · ${NOMS_RESULTATS[donne.resultat]}`,
			donne.etoile ? " ★" : "",
		);
		return li;
	}).reverse());
}

function afficher() {
	const enAnnonce = etat.enCours === null;
	$("phase-annonce").hidden = !enAnnonce;
	$("phase-resultat").hidden = enAnnonce;
	if (enAnnonce) afficherAnnonce();
	else afficherResultat();

	afficherMarque();
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
		afficherAnnonce();
	});

	$("coinches").addEventListener("click", (e) => {
		const bouton = e.target.closest("[data-coinche]");
		if (!bouton) return;
		brouillon.coinche = Number(bouton.dataset.coinche);
		afficherAnnonce();
	});

	for (const bouton of document.querySelectorAll("[data-preneur]")) {
		bouton.addEventListener("click", () => {
			if (brouillon.annonce === null) return;
			etoile = false;
			appliquer(prendre(etat, { preneur: bouton.dataset.preneur, ...brouillon }));
		});
	}

	$("etoile").addEventListener("click", () => {
		etoile = !etoile;
		afficherResultat();
	});

	for (const bouton of document.querySelectorAll("[data-resultat]")) {
		bouton.addEventListener("click", () => {
			brouillon = { annonce: null, coinche: 1 };
			appliquer(terminerDonne(etat, bouton.dataset.resultat, etoile));
		});
	}

	$("modifier").addEventListener("click", () => {
		const { annonce, coinche } = etat.enCours;
		brouillon = { annonce, coinche };
		appliquer(modifierAnnonce(etat));
	});

	$("annuler-donne").addEventListener("click", () => {
		const derniere = etat.donnes.at(-1);
		if (!derniere) return;
		const description = `${libelleAnnonce(derniere)} · ${NOMS_RESULTATS[derniere.resultat]}`;
		if (!confirm(`Annuler la dernière donne ?\n${description}`)) return;
		brouillon = { annonce: null, coinche: 1 };
		appliquer(annulerDerniereDonne(etat));
	});

	$("nouvelle-partie").addEventListener("click", () => {
		if (etat.donnes.length && !confirm("Commencer une nouvelle partie ? Les scores seront effacés.")) return;
		brouillon = { annonce: null, coinche: 1 };
		appliquer(nouvellePartie(etat.donneur));
	});
}

export function demarrer() {
	etat = charger();
	construireControles();
	brancherActions();
	afficher();
}
