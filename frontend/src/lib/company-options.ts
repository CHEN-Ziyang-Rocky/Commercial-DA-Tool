import { createFilterOptions } from "@mui/material/Autocomplete";
import type { CompanyOption } from "./registry-types";

// Keep the entire matching list navigable, including entities beyond the common shortcuts.
// No display limit: the current reference universe is bounded to 3,000 entities.
export const filterCompanies = createFilterOptions<CompanyOption>({
  trim: true,
  stringify: (o) => [o.label, o.legalName, o.lei, ...o.otherNames].join(" "),
});
