import { createTablePalette } from "./tablePalette";

// Go Fish table palette (teal "ocean" by default, fitting the theme). See
// tablePalette.js.
const palette = createTablePalette("@cardnight:gofishTable", "teal");

export const GOFISH_TABLES = palette.TABLES;
export const getGofishTableId = () => palette.getId();
export const getGofishTable = () => palette.get();
export const initGofishTable = () => palette.init();
export const setGofishTable = (id) => palette.set(id);
export const subscribeGofishTable = (fn) => palette.subscribe(fn);
