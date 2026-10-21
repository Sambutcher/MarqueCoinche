// Point d'entrée : démarre l'interface et les services propres au téléphone.

import { demarrer } from "./ui.js";

const CLE_ECRAN = "marque-coinche-ecran-allume";

demarrer();

// Hors connexion et mises à jour
if ("serviceWorker" in navigator) {
	navigator.serviceWorker.register("./sw.js").catch(() => {});
}

// Demande que les scores ne soient pas effacés par le navigateur quand l'espace manque
navigator.storage?.persist?.().catch(() => {});

// --- Garder l'écran allumé (API Wake Lock, iOS 16.4 et plus) ---

function brancherEcranAllume() {
	if (!("wakeLock" in navigator)) return;

	const option = document.getElementById("option-ecran");
	const caseEcran = document.getElementById("ecran-allume");
	let verrou = null;

	async function verrouiller() {
		if (!caseEcran.checked || verrou || document.visibilityState !== "visible") return;
		try {
			verrou = await navigator.wakeLock.request("screen");
			verrou.addEventListener("release", () => { verrou = null; });
		} catch {
			verrou = null;
		}
	}

	try {
		caseEcran.checked = localStorage.getItem(CLE_ECRAN) === "1";
	} catch {
		// préférence non disponible : option décochée
	}

	caseEcran.addEventListener("change", () => {
		try {
			localStorage.setItem(CLE_ECRAN, caseEcran.checked ? "1" : "0");
		} catch {
			// préférence non mémorisée
		}
		if (caseEcran.checked) verrouiller();
		else verrou?.release();
	});

	// Le verrou est relâché quand l'app passe en arrière-plan : on le reprend au retour
	document.addEventListener("visibilitychange", verrouiller);

	option.hidden = false;
	verrouiller();
}

brancherEcranAllume();
