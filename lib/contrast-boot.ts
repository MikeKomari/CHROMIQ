export const CONTRAST_STORAGE_KEY = "prism-contrast";

/** Inline in <head> so the stored preference applies before first paint. */
export const contrastBootScript = `try{document.documentElement.dataset.contrast=localStorage.getItem("${CONTRAST_STORAGE_KEY}")==="high"?"high":"comfort"}catch(e){}`;

export const UI_SCALE_STORAGE_KEY = "prism-ui-scale";

/** Inline in <head> so the stored interface text size applies before first paint. */
export const uiScaleBootScript = `try{var s=localStorage.getItem("${UI_SCALE_STORAGE_KEY}");document.documentElement.dataset.uiScale=s==="large"||s==="xlarge"?s:"default"}catch(e){}`;
