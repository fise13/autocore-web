export * from "@/lib/domain/types";
export * from "@/lib/domain/normalize";
export {
  DomainDictionary,
  getGlobalDictionary,
  searchDomain,
} from "@/lib/domain/domain-dictionary";
export {
  buildCompanyDictionary,
  createCompanyEntry,
  companyEntryExists,
  type CompanyDomainEntry,
  type CompanyDomainMap,
} from "@/lib/domain/company-dictionary";
export { GLOBAL_DICTIONARIES } from "@/lib/domain/dictionaries";
