// Réunit toutes les suites : utilisé par tests.html (navigateur) et tests/lancer.mjs (Node, CI).

import { lancerTests as regles } from "./regles.test.js";
import { lancerTests as partage } from "./partage.test.js";

export const lancerTests = () => [...regles(), ...partage()];
