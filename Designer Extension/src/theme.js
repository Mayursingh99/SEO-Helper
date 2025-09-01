import { createTheme } from "@mui/material/styles";

const theme = createTheme({
  typography: {
    // Base body font size ~16px
    fontSize: 16,
    body1: {
      fontSize: "1rem", // 16px
      lineHeight: 1.5,
    },
    body2: {
      fontSize: "0.875rem", // 14px
      lineHeight: 1.5,
    },
    caption: {
      fontSize: "0.875rem", // 14px minimum
    },
    button: {
      fontSize: "0.875rem", // 14px minimum
      textTransform: "none",
    },
    overline: {
      fontSize: "0.875rem", // 14px minimum
      textTransform: "none",
    },
  },
});

export default theme;
