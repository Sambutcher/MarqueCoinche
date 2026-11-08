// Lance tous les tests sous Node : `node tests/lancer.mjs`. Code de sortie 1 au moindre échec.

import { lancerTests } from "./tous.js";

const resultats = lancerTests();
for (const r of resultats) console.log(r.ok ? `✓ ${r.nom}` : `✗ ${r.nom} — ${r.erreur}`);
const echecs = resultats.filter((r) => !r.ok);
console.log(`\n${resultats.length - echecs.length}/${resultats.length} tests réussis`);
process.exit(echecs.length ? 1 : 0);
