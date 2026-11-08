// Générateur de QR Code minimal (mode octets, correction d'erreur L, versions 1 à 10).
// Adapté de l'algorithme de référence de Project Nayuki (domaine public / MIT).
// qrcode(texte) renvoie une matrice de booléens (true = module sombre).

const ECC_PAR_BLOC = [7, 10, 15, 20, 26, 18, 20, 24, 30, 18]; // niveau L, versions 1 à 10
const NB_BLOCS = [1, 1, 1, 1, 1, 2, 2, 2, 2, 4];

// --- Arithmétique de Reed-Solomon dans GF(256) ---

function multiplier(x, y) {
	let z = 0;
	for (let i = 7; i >= 0; i--) {
		z = (z << 1) ^ ((z >>> 7) * 0x11d);
		z ^= ((y >>> i) & 1) * x;
	}
	return z;
}

function diviseur(degre) {
	const resultat = new Array(degre).fill(0);
	resultat[degre - 1] = 1;
	let racine = 1;
	for (let i = 0; i < degre; i++) {
		for (let j = 0; j < degre; j++) {
			resultat[j] = multiplier(resultat[j], racine);
			if (j + 1 < degre) resultat[j] ^= resultat[j + 1];
		}
		racine = multiplier(racine, 2);
	}
	return resultat;
}

function reste(donnees, div) {
	const resultat = div.map(() => 0);
	for (const b of donnees) {
		const facteur = b ^ resultat.shift();
		resultat.push(0);
		div.forEach((coef, i) => { resultat[i] ^= multiplier(coef, facteur); });
	}
	return resultat;
}

// --- Capacités ---

function modulesDonnees(version) {
	let n = (16 * version + 128) * version + 64;
	if (version >= 2) {
		const nbAlign = Math.floor(version / 7) + 2;
		n -= (25 * nbAlign - 10) * nbAlign - 55;
		if (version >= 7) n -= 36;
	}
	return n;
}

const motsDonnees = (version) =>
	Math.floor(modulesDonnees(version) / 8) - ECC_PAR_BLOC[version - 1] * NB_BLOCS[version - 1];

function positionsAlignement(version) {
	if (version === 1) return [];
	const nb = Math.floor(version / 7) + 2;
	const pas = version === 32 ? 26 : Math.ceil((version * 4 + 4) / (nb * 2 - 2)) * 2;
	const pos = [6];
	for (let p = version * 4 + 10; pos.length < nb; p -= pas) pos.splice(1, 0, p);
	return pos;
}

// --- Construction ---

function octets(texte) {
	return [...new TextEncoder().encode(texte)];
}

function codemots(donnees, version) {
	const bits = [];
	const ajouter = (valeur, n) => { for (let i = n - 1; i >= 0; i--) bits.push((valeur >>> i) & 1); };
	ajouter(0b0100, 4);
	ajouter(donnees.length, version < 10 ? 8 : 16);
	donnees.forEach((b) => ajouter(b, 8));
	const capacite = motsDonnees(version) * 8;
	ajouter(0, Math.min(4, capacite - bits.length));
	ajouter(0, (8 - (bits.length % 8)) % 8);
	for (let pad = 0xec; bits.length < capacite; pad ^= 0xec ^ 0x11) ajouter(pad, 8);
	const mots = [];
	for (let i = 0; i < bits.length; i += 8) mots.push(parseInt(bits.slice(i, i + 8).join(""), 2));

	// Découpage en blocs, correction d'erreur, entrelacement
	const nbBlocs = NB_BLOCS[version - 1];
	const tailleEcc = ECC_PAR_BLOC[version - 1];
	const total = Math.floor(modulesDonnees(version) / 8);
	const nbCourts = nbBlocs - (total % nbBlocs);
	const longueurCourt = Math.floor(total / nbBlocs);
	const div = diviseur(tailleEcc);
	const blocs = [];
	for (let i = 0, k = 0; i < nbBlocs; i++) {
		const dat = mots.slice(k, k + longueurCourt - tailleEcc + (i < nbCourts ? 0 : 1));
		k += dat.length;
		const ecc = reste(dat, div);
		if (i < nbCourts) dat.push(0); // case vide, ignorée à l'entrelacement
		blocs.push(dat.concat(ecc));
	}
	const resultat = [];
	for (let i = 0; i < blocs[0].length; i++) {
		blocs.forEach((bloc, j) => {
			if (i !== longueurCourt - tailleEcc || j >= nbCourts) resultat.push(bloc[i]);
		});
	}
	return resultat;
}

export function qrcode(texte) {
	const donnees = octets(texte);
	let version = 1;
	while (version <= 10 && donnees.length + (version < 10 ? 2 : 3) > motsDonnees(version)) version++;
	if (version > 10) throw new Error("texte trop long pour le QR Code");

	const taille = version * 4 + 17;
	const modules = Array.from({ length: taille }, () => new Array(taille).fill(false));
	const reserve = Array.from({ length: taille }, () => new Array(taille).fill(false));
	const poser = (x, y, sombre) => {
		if (x < 0 || y < 0 || x >= taille || y >= taille) return;
		modules[y][x] = sombre;
		reserve[y][x] = true;
	};

	// Motifs de repérage et lignes de synchronisation
	for (let i = 0; i < taille; i++) {
		poser(6, i, i % 2 === 0);
		poser(i, 6, i % 2 === 0);
	}
	for (const [cx, cy] of [[3, 3], [taille - 4, 3], [3, taille - 4]]) {
		for (let dy = -4; dy <= 4; dy++) {
			for (let dx = -4; dx <= 4; dx++) {
				const d = Math.max(Math.abs(dx), Math.abs(dy));
				poser(cx + dx, cy + dy, d !== 2 && d !== 4);
			}
		}
	}
	// Motifs d'alignement
	const align = positionsAlignement(version);
	align.forEach((cx, i) => align.forEach((cy, j) => {
		if ((i === 0 && j === 0) || (i === 0 && j === align.length - 1) || (i === align.length - 1 && j === 0)) return;
		for (let dy = -2; dy <= 2; dy++) {
			for (let dx = -2; dx <= 2; dx++) poser(cx + dx, cy + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
		}
	}));

	// Zones de format et de version (réservées, remplies plus bas)
	const formats = (masque) => {
		const donneesFormat = (0b01 << 3) | masque; // niveau L = 01
		let reste10 = donneesFormat;
		for (let i = 0; i < 10; i++) reste10 = (reste10 << 1) ^ ((reste10 >>> 9) * 0x537);
		const bits = ((donneesFormat << 10) | reste10) ^ 0x5412;
		const b = (i) => ((bits >>> i) & 1) !== 0;
		for (let i = 0; i <= 5; i++) poser(8, i, b(i));
		poser(8, 7, b(6));
		poser(8, 8, b(7));
		poser(7, 8, b(8));
		for (let i = 9; i < 15; i++) poser(14 - i, 8, b(i));
		for (let i = 0; i < 8; i++) poser(taille - 1 - i, 8, b(i));
		for (let i = 8; i < 15; i++) poser(8, taille - 15 + i, b(i));
		poser(8, taille - 8, true);
	};
	formats(0);
	if (version >= 7) {
		let r = version;
		for (let i = 0; i < 12; i++) r = (r << 1) ^ ((r >>> 11) * 0x1f25);
		const bits = (version << 12) | r;
		for (let i = 0; i < 18; i++) {
			const sombre = ((bits >>> i) & 1) !== 0;
			const a = taille - 11 + (i % 3);
			const b = Math.floor(i / 3);
			poser(a, b, sombre);
			poser(b, a, sombre);
		}
	}

	// Placement des données en zigzag
	const mots = codemots(donnees, version);
	const bitsDonnees = [];
	mots.forEach((m) => { for (let i = 7; i >= 0; i--) bitsDonnees.push((m >>> i) & 1); });
	let k = 0;
	for (let droite = taille - 1; droite >= 1; droite -= 2) {
		if (droite === 6) droite = 5;
		for (let v = 0; v < taille; v++) {
			for (let j = 0; j < 2; j++) {
				const x = droite - j;
				const y = ((droite + 1) & 2) === 0 ? taille - 1 - v : v;
				if (!reserve[y][x] && k < bitsDonnees.length) modules[y][x] = bitsDonnees[k++] === 1;
			}
		}
	}

	// Choix du masque de plus faible pénalité
	const masques = [
		(x, y) => (x + y) % 2 === 0,
		(x, y) => y % 2 === 0,
		(x) => x % 3 === 0,
		(x, y) => (x + y) % 3 === 0,
		(x, y) => (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0,
		(x, y) => ((x * y) % 2) + ((x * y) % 3) === 0,
		(x, y) => (((x * y) % 2) + ((x * y) % 3)) % 2 === 0,
		(x, y) => (((x + y) % 2) + ((x * y) % 3)) % 2 === 0,
	];
	let meilleur = null;
	let meilleurePenalite = Infinity;
	for (let m = 0; m < 8; m++) {
		const copie = modules.map((ligne) => ligne.slice());
		for (let y = 0; y < taille; y++) {
			for (let x = 0; x < taille; x++) if (!reserve[y][x] && masques[m](x, y)) copie[y][x] = !copie[y][x];
		}
		const saveModules = modules.map((l) => l.slice());
		for (let y = 0; y < taille; y++) modules[y] = copie[y];
		formats(m);
		const p = penalite(modules);
		if (p < meilleurePenalite) { meilleurePenalite = p; meilleur = modules.map((l) => l.slice()); }
		for (let y = 0; y < taille; y++) modules[y] = saveModules[y];
	}
	return meilleur;
}

function penalite(m) {
	const n = m.length;
	let total = 0;
	const lignes = (get) => {
		for (let a = 0; a < n; a++) {
			let serie = 1;
			for (let b = 1; b < n; b++) {
				if (get(a, b) === get(a, b - 1)) {
					serie++;
					if (serie === 5) total += 3;
					else if (serie > 5) total++;
				} else serie = 1;
			}
		}
	};
	lignes((a, b) => m[a][b]);
	lignes((a, b) => m[b][a]);
	for (let y = 0; y < n - 1; y++) {
		for (let x = 0; x < n - 1; x++) {
			if (m[y][x] === m[y][x + 1] && m[y][x] === m[y + 1][x] && m[y][x] === m[y + 1][x + 1]) total += 3;
		}
	}
	const motif = [1, 0, 1, 1, 1, 0, 1, 0, 0, 0, 0];
	const trouve = (get) => {
		for (let a = 0; a < n; a++) {
			for (let b = 0; b + 11 <= n; b++) {
				const sens = motif.every((v, i) => (get(a, b + i) ? 1 : 0) === v);
				const inverse = motif.every((v, i) => (get(a, b + 10 - i) ? 1 : 0) === v);
				if (sens) total += 40;
				if (inverse) total += 40;
			}
		}
	};
	trouve((a, b) => m[a][b]);
	trouve((a, b) => m[b][a]);
	const sombres = m.flat().filter(Boolean).length;
	total += Math.floor(Math.abs(sombres * 20 - n * n * 10) / (n * n)) * 10;
	return total;
}

// Dessine le QR Code en SVG (marge de 4 modules, fond blanc pour rester lisible en thème sombre).
export function qrcodeSvg(texte) {
	const m = qrcode(texte);
	const n = m.length + 8;
	let chemin = "";
	m.forEach((ligne, y) => ligne.forEach((sombre, x) => {
		if (sombre) chemin += `M${x + 4},${y + 4}h1v1h-1z`;
	}));
	return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n} ${n}" shape-rendering="crispEdges">`
		+ `<rect width="${n}" height="${n}" fill="#fff"/><path d="${chemin}" fill="#000"/></svg>`;
}
