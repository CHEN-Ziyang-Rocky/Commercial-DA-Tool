import { Box, Button } from "@mui/material";

export default function ProjectLinks() {
  return (
    <Box
      component="nav"
      aria-label="Project links"
      sx={{
        display: "flex",
        justifyContent: "flex-end",
        alignItems: "center",
        gap: { xs: 0.5, sm: 1 },
        flexShrink: 0,
        "& .MuiButton-root": { minHeight: 44, minWidth: 0, px: 0.75, fontSize: { xs: 11, sm: 12 } },
      }}
    >
      <Button href="https://imrocky.com/" size="small" sx={{ minHeight: 44 }}>
        <span aria-hidden="true">←&nbsp;</span>Portfolio
      </Button>
      <Button
        href="https://github.com/CHEN-Ziyang-Rocky/Commercial-DA-Tool"
        target="_blank"
        rel="noopener noreferrer"
        size="small"
        aria-label="Commercial Data Analytics source on GitHub (opens in a new tab)"
        sx={{ minHeight: 44 }}
      >
        GitHub<span aria-hidden="true">&nbsp;↗</span>
      </Button>
    </Box>
  );
}
