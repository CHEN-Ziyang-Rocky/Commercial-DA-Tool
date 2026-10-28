import { createTheme } from "@mui/material/styles";
const theme = createTheme({
  palette: {
    mode: "light",
    primary: { main: "#126c72" },
    secondary: { main: "#294861" },
    background: { default: "#f3f6f8", paper: "#ffffff" },
    text: { primary: "#172d3d", secondary: "#526575" },
    warning: { main: "#a75a13" },
    info: { main: "#24688c" },
  },
  typography: {
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif',
    h4: { letterSpacing: "-0.025em" },
    h3: { fontWeight: 700 },
  },
  shape: { borderRadius: 12 },
  components: {
    MuiStack: { defaultProps: { useFlexGap: true } },
    MuiCard: {
      styleOverrides: {
        root: {
          border: "1px solid #dce5eb",
          boxShadow: "0 3px 12px rgba(23,45,61,0.035)",
          backgroundImage: "none",
        },
      },
    },
    MuiButton: {
      styleOverrides: { root: { textTransform: "none", fontWeight: 600 } },
    },
    MuiTableCell: {
      styleOverrides: {
        head: { backgroundColor: "#edf3f6", fontWeight: 700 },
        root: { paddingTop: 14, paddingBottom: 14 },
      },
    },
    MuiLink: { defaultProps: { underline: "hover" } },
    MuiCssBaseline: {
      styleOverrides: {
        a: { color: "#126c72", textUnderlineOffset: "3px" },
        body: { fontVariantNumeric: "tabular-nums" },
      },
    },
  },
});
export default theme;
