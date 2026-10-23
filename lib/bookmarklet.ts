/** Widget served from public/chromiq-widget.js; the dock element id guards double-loading. */
export const WIDGET_DOCK_ID = "chromiq-restyle-dock";

export function bookmarkletHref(origin: string) {
  return `javascript:(function(){if(document.getElementById('${WIDGET_DOCK_ID}'))return;var s=document.createElement('script');s.src='${origin}/chromiq-widget.js';document.body.appendChild(s);})()`;
}
