// Service worker : l'app fonctionne hors connexion et se met à jour toute seule.
// Stratégie « réseau d'abord » : la dernière version publiée est servie dès qu'il y a du réseau,
// le cache ne sert qu'en secours. Changer VERSION n'est utile que si la liste FICHIERS change.

const VERSION = "v2";
const CACHE = `marque-coinche-${VERSION}`;
const DELAI_RESEAU = 3000; // au-delà, on sert le cache pour ne pas bloquer l'ouverture

const FICHIERS = [
	"./",
	"index.html",
	"style.css",
	"js/main.js",
	"js/ui.js",
	"js/etat.js",
	"js/regles.js",
	"manifest.json",
	"apple-touch-icon.png",
	"icon-192.png",
	"icon-512.png",
	"favicon.ico",
	"favicon-16x16.png",
	"favicon-32x32.png",
];

self.addEventListener("install", (event) => {
	self.skipWaiting();
	event.waitUntil(
		caches.open(CACHE).then((cache) => cache.addAll(FICHIERS.map((f) => new Request(f, { cache: "reload" })))),
	);
});

self.addEventListener("activate", (event) => {
	event.waitUntil(
		caches.keys()
			.then((cles) => Promise.all(cles.filter((cle) => cle !== CACHE).map((cle) => caches.delete(cle))))
			.then(() => self.clients.claim()),
	);
});

async function reseauDabord(requete) {
	const cache = await caches.open(CACHE);
	const reseau = fetch(requete, { cache: "no-cache" }).then((reponse) => {
		if (reponse.ok) cache.put(requete, reponse.clone());
		return reponse;
	});

	const enCache = await cache.match(requete, { ignoreSearch: true });
	if (!enCache) return reseau;

	// Réseau lent ou absent : on sert le cache, la réponse réseau mettra le cache à jour
	const delai = new Promise((resoudre) => setTimeout(() => resoudre(enCache), DELAI_RESEAU));
	return Promise.race([reseau.catch(() => enCache), delai]);
}

self.addEventListener("fetch", (event) => {
	const { request } = event;
	if (request.method !== "GET" || new URL(request.url).origin !== self.location.origin) return;
	event.respondWith(reseauDabord(request));
});
