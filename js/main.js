// Point d'entrée : démarre l'interface et les services propres au téléphone.

import { demarrer } from "./ui.js";

demarrer();

// Pas de zoom : le pincement est bloqué (Safari iOS ignore user-scalable)
for (const type of ["gesturestart", "gesturechange", "gestureend"]) {
	document.addEventListener(type, (e) => e.preventDefault());
}
document.addEventListener("touchmove", (e) => {
	if (e.touches.length > 1) e.preventDefault();
}, { passive: false });

// Hors connexion et mises à jour
if ("serviceWorker" in navigator) {
	navigator.serviceWorker.register("./sw.js").catch(() => {});
}

// Demande que les scores ne soient pas effacés par le navigateur quand l'espace manque
navigator.storage?.persist?.().catch(() => {});

// --- Garder l'écran allumé en permanence (API Wake Lock, iOS 16.4 et plus) ---

function garderEcranAllume() {
	if (!("wakeLock" in navigator)) return;

	let verrou = null;

	async function verrouiller() {
		if (verrou || document.visibilityState !== "visible") return;
		try {
			verrou = await navigator.wakeLock.request("screen");
			verrou.addEventListener("release", () => { verrou = null; });
		} catch {
			verrou = null;
		}
	}

	// Le verrou est relâché quand l'app passe en arrière-plan : on le reprend au retour
	document.addEventListener("visibilitychange", verrouiller);
	verrouiller();
}

garderEcranAllume();
