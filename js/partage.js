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

// Renvoie { donnes, donneur, enCours, joueurs } ou null si la table est inconnue.
// Lève une erreur si le réseau ou le service est indisponible.
export async function lire(code) {
	if (!configure()) throw new Error("partage non configuré");
	const reponse = await fetch(url(code));
	if (!reponse.ok) throw new Error(`erreur ${reponse.status}`);
	const ligne = await reponse.json(); // null si la table n'existe pas
	return ligne
		? {
			donnes: Array.isArray(ligne.donnes) ? ligne.donnes : [],
			donneur: ligne.donneur ?? 0,
			enCours: ligne.en_cours ?? null,
			joueurs: Array.isArray(ligne.joueurs) ? ligne.joueurs : ["", "", "", ""],
		}
		: null;
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
