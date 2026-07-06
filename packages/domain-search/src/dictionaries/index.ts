import type { DomainCategory, DomainEntry } from '../types';

import brands from './brands.json';
import engines from './engines.json';

export const GLOBAL_DICTIONARIES: Record<DomainCategory, DomainEntry[]> = {
  engines: engines as DomainEntry[],
  brands: brands as DomainEntry[],
};
