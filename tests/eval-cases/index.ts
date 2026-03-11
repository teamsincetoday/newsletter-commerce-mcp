export { morningBrewCase } from "./morning-brew.js";
export { tldrTechCase } from "./tldr-tech.js";
export { milkRoadCase } from "./milk-road.js";

import { morningBrewCase } from "./morning-brew.js";
import { tldrTechCase } from "./tldr-tech.js";
import { milkRoadCase } from "./milk-road.js";
import type { NewsletterEvalCase } from "../eval-types.js";

export const ALL_CASES: NewsletterEvalCase[] = [
  morningBrewCase,
  tldrTechCase,
  milkRoadCase,
];
