import { Accordion, AccordionDetails, AccordionSummary, Button, Stack, Typography } from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import Link from "next/link";
export function WorkspaceHelp() {
  return <Accordion disableGutters elevation={0} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, '&:before': { display: 'none' } }}>
    <AccordionSummary expandIcon={<ExpandMoreIcon />}><Typography variant="body2" fontWeight={600}>How to use this workspace</Typography></AccordionSummary>
    <AccordionDetails><Stack spacing={1.5}>
      <Typography variant="body2"><strong>Find the entity.</strong> Search a legal name, other name or LEI. Recently used companies appear first for your account on this browser, followed by the complete A–Z list. Clear recent history whenever needed.</Typography>
      <Typography variant="body2"><strong>Define the scope.</strong> Use one hierarchy root to inspect relative levels, or select up to 10 companies in a review portfolio. Their recorded two-generation scopes are combined; each entity counts once.</Typography>
      <Typography variant="body2"><strong>Check and share.</strong> Narrow by country, city or status. Open a record to verify source evidence, then export the matching records or copy a view link. Administrators can assign evidence reviews.</Typography>
      <Typography variant="body2" color="text.secondary">Missing companies and relationships may be outside coverage. This is a public reference snapshot, not a complete client register. Contracts and campaign results require separate business records.</Typography>
      <Stack direction="row" gap={1} flexWrap="wrap">
        <Button component={Link} href="/entities" size="small">Open entity register</Button>
        <Button component="a" href="https://search.gleif.org/" target="_blank" rel="noopener noreferrer" size="small">Find an unlisted entity at GLEIF ↗</Button>
      </Stack>
      <Typography variant="caption" color="text.secondary">For an unlisted company, give its verified LEI to the workspace administrator for a reviewed data import. A source search does not automatically add a record here.</Typography>
    </Stack></AccordionDetails>
  </Accordion>;
}
