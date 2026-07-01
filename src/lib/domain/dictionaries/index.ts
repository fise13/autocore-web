import type { DomainCategory, DomainEntry } from "@/lib/domain/types";

import bodyParts from "./body-parts.json";
import brands from "./brands.json";
import colors from "./colors.json";
import consumables from "./consumables.json";
import countries from "./countries.json";
import driveTypes from "./drive-types.json";
import engines from "./engines.json";
import fuelTypes from "./fuel-types.json";
import models from "./models.json";
import transmissions from "./transmissions.json";

/** Global, ship-with-the-app dictionaries keyed by category. */
export const GLOBAL_DICTIONARIES: Record<DomainCategory, DomainEntry[]> = {
  engines: engines as DomainEntry[],
  transmissions: transmissions as DomainEntry[],
  bodyParts: bodyParts as DomainEntry[],
  consumables: consumables as DomainEntry[],
  brands: brands as DomainEntry[],
  models: models as DomainEntry[],
  fuelTypes: fuelTypes as DomainEntry[],
  driveTypes: driveTypes as DomainEntry[],
  colors: colors as DomainEntry[],
  countries: countries as DomainEntry[],
};
