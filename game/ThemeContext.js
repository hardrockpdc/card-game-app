import React, { createContext, useContext, useState, useEffect } from "react";
import { subscribe, getTheme } from "./cardTheme";

const ThemeContext = createContext(getTheme());

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(getTheme);
  useEffect(() => subscribe(setTheme), []);
  return (
    <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>
  );
}

// Call this inside any component that should re-render when the theme changes.
export function useTheme() {
  return useContext(ThemeContext);
}
