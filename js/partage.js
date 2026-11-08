// Partage des scores entre tables via Firebase Realtime Database (API REST, sans SDK).
// Toute erreur réseau est sans conséquence pour la partie locale : on ne fait que publier.

// URL de la base, affichée en haut de l'onglet Données de la console Firebase.
const FIREBASE_DB_URL = "https://marquecoinche-default-rtdb.europe-west1.firebasedatabase.app";

const configure = () => !FIREBASE_DB_URL.includes("VOTRE-PROJET");

const url = (code) => `${FIREBASE_DB_URL}/tables/${encodeURIComponent(code)}.json`;

export const partageDisponible = configure;

// Envoie l'instantané de la partie ; renvoie true si le serveur l'a reçu.
// Realtime Database n'enregistre ni les null ni les tableaux vides : la lecture les rétablit.
export async function publier(etat) {
	if (!configure() || !etat.table) return false;
	try {
		const reponse = await fetch(url(etat.table), {
			method: "PUT", // remplace le document (le crée s'il n'existe pas)
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				donnes: etat.donnes,
				donneur: etat.donneur,
				joueurs: etat.joueurs,
				en_cours: etat.enCours,
				maj: new Date().toISOString(),
			}),
		});
		return reponse.ok;
	} catch {
		return false;
	}
}

function normaliser(ligne) {
	return ligne
		? {
			donnes: Array.isArray(ligne.donnes) ? ligne.donnes : [],
			donneur: ligne.donneur ?? 0,
			enCours: ligne.en_cours ?? null,
			joueurs: Array.isArray(ligne.joueurs) ? ligne.joueurs : ["", "", "", ""],
		}
		: null;
}

// Renvoie { donnes, donneur, enCours, joueurs } ou null si la table est inconnue.
// Lève une erreur si le réseau ou le service est indisponible.
export async function lire(code) {
	if (!configure()) throw new Error("partage non configuré");
	const reponse = await fetch(url(code));
	if (!reponse.ok) throw new Error(`erreur ${reponse.status}`);
	return normaliser(await reponse.json()); // null si la table n'existe pas
}

export const suiviTempsReelDisponible = () => configure() && typeof EventSource !== "undefined";

// Suit une table en temps réel (flux Server-Sent Events de Firebase).
// surTable reçoit la table (ou null si inconnue) à la connexion puis à chaque modification.
// surErreur(definitive) : coupure passagère (le navigateur se reconnecte seul) ou, si definitive,
// flux abandonné. Renvoie une fonction qui ferme le flux.
export function suivre(code, surTable, surErreur) {
	const source = new EventSource(url(code));
	// publier() remplace tout le document : un put à la racine contient l'état complet.
	// Les autres événements (patch, chemin partiel) ne sont pas attendus : on resynchronise par lecture.
	source.addEventListener("put", (e) => {
		try {
			const { path, data } = JSON.parse(e.data);
			if (path === "/") surTable(normaliser(data));
			else lire(code).then(surTable, () => surErreur(false));
		} catch {
			surErreur(false);
		}
	});
	source.addEventListener("patch", () => lire(code).then(surTable, () => surErreur(false)));
	source.addEventListener("cancel", () => { source.close(); surErreur(true); });
	source.addEventListener("auth_revoked", () => { source.close(); surErreur(true); });
	source.onerror = () => surErreur(source.readyState === EventSource.CLOSED);
	return () => source.close();
}

// Tire un numéro de table qui n'existe pas encore (3 essais, puis on garde le dernier).
export async function tableLibre(generer) {
	let code = generer();
	for (let i = 0; i < 3; i++) {
		try {
			if ((await lire(code)) === null) return code;
		} catch {
			return code; // hors connexion : on garde le numéro tiré
		}
		code = generer();
	}
	return code;
}
