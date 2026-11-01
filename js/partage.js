// Partage des scores entre tables via Supabase (API REST, sans SDK).
// Toute erreur réseau est sans conséquence pour la partie locale : on ne fait que publier.

const SUPABASE_URL = "https://hpghdquugdhuxmbsdeif.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_paf4ozkyYZVERCAdT-ERuQ_UHV4biz_"; // clé publique par conception (voir supabase.sql)

const configure = () => !SUPABASE_URL.includes("VOTRE-PROJET");

const entetes = {
	apikey: SUPABASE_ANON_KEY,
	Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
};

export const partageDisponible = configure;

// Envoie l'instantané de la partie ; renvoie true si le serveur l'a reçu.
export async function publier(etat) {
	if (!configure() || !etat.table) return false;
	try {
		const reponse = await fetch(`${SUPABASE_URL}/rest/v1/tables`, {
			method: "POST",
			headers: { ...entetes, "Content-Type": "application/json", Prefer: "resolution=merge-duplicates" },
			body: JSON.stringify({
				code: etat.table,
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
	const reponse = await fetch(
		`${SUPABASE_URL}/rest/v1/tables?code=eq.${encodeURIComponent(code)}&select=donnes,donneur,en_cours,joueurs`,
		{ headers: entetes },
	);
	if (!reponse.ok) throw new Error(`erreur ${reponse.status}`);
	const [ligne] = await reponse.json();
	return ligne
		? {
			donnes: ligne.donnes,
			donneur: ligne.donneur,
			enCours: ligne.en_cours,
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
