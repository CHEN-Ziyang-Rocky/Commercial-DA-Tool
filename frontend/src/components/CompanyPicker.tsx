import { Autocomplete, Box, Button, TextField, Typography, AutocompleteRenderInputParams } from "@mui/material";
import { useMemo } from "react";
import { filterCompanies } from "@/lib/company-options";
import { CompanyOption } from "@/lib/registry-types";
import { orderCompanies } from "@/lib/recent-companies";
import { useRecentCompanies } from "@/lib/useRecentCompanies";

type Props = {
  options: CompanyOption[];
  label: string;
  helperText: string;
  loading?: boolean;
} & ({ multiple: true; value: string[]; onChange: (value: string[]) => void } |
     { multiple?: false; value: string; onChange: (value: string) => void });
export function CompanyPicker(props: Props) {
  const { recent, remember, clear } = useRecentCompanies();
  const options = useMemo(() => orderCompanies(props.options, recent), [props.options, recent]);
  const recentSet = new Set(recent);
  const recentCount = options.filter((o) => recentSet.has(o.lei)).length;
  const selected = (lei: string): CompanyOption => props.options.find((o) => o.lei === lei) ?? {
    lei, label: lei, legalName: "Selected entity", otherNames: [], country: "", sector: "", featured: false,
  };
  const common = {
    options,
    loading: props.loading,
    filterOptions: filterCompanies,
    openOnFocus: true,
    handleHomeEndKeys: true,
    getOptionLabel: (o: CompanyOption) => o.label,
    isOptionEqualToValue: (a: CompanyOption, b: CompanyOption) => a.lei === b.lei,
    groupBy: (o: CompanyOption) => recentSet.has(o.lei) ? "Recently used" : "All recorded companies · A–Z",
    renderOption: (li: React.HTMLAttributes<HTMLLIElement>, o: CompanyOption) => (
      <li {...li} key={o.lei}><Box sx={{ py: 0.5 }}>
        <Typography>{o.label}</Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
          {o.legalName} · {o.country} · {o.lei}
        </Typography>
      </Box></li>
    ),
    renderInput: (p: AutocompleteRenderInputParams) => (
      <TextField {...p} label={props.label} helperText={<><strong>{props.loading ? "Loading companies…" : `${props.options.length.toLocaleString("en-US")} companies available · Browse the full list or type to search.`}</strong><br />{props.helperText}{recentCount > 0 && <><br />Recently used on this browser, for your account. <Button size="small" onClick={clear}>Clear recent</Button></>}</>} placeholder="Company, Chinese / English name or LEI" />
    ),
    noOptionsText: "No match in this snapshot. Try a legal name or LEI; this is not a global live search.",
  };
  return props.multiple ? (
    <Autocomplete {...common} multiple filterSelectedOptions limitTags={3}
      value={props.value.map(selected)}
      getOptionDisabled={(o) => props.value.length >= 10 && !props.value.includes(o.lei)}
      onChange={(_, values) => {
        const added = values.filter((o) => !props.value.includes(o.lei)).map((o) => o.lei);
        if (added.length) remember(added);
        props.onChange(values.map((o) => o.lei));
      }} />
  ) : (
    <Autocomplete {...common} value={props.value ? selected(props.value) : null}
      onChange={(_, value) => { if (value) remember([value.lei]); props.onChange(value?.lei ?? ""); }} />
  );
}
