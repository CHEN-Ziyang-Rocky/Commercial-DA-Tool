import { Box, Button } from "@mui/material";
import { drawerWidth } from "./Sidebar";

export default function ProjectLinks({ publicPage }: { publicPage: boolean }) {
  return (
    <Box
      component="nav"
      aria-label="Project links"
      sx={{
        display: "flex",
        justifyContent: "flex-end",
        alignItems: "center",
        gap: 1,
        height: 48,
        px: { xs: 2, md: 3 },
        pl: { xs: publicPage ? 2 : 7, md: 3 },
        ml: { md: publicPage ? 0 : `${drawerWidth}px` },
        borderBottom: 1,
        borderColor: "divider",
        bgcolor: "background.paper",
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
