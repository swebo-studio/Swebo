import { useEffect, useState } from "react";

/**
 * True when the visitor has asked for less motion — either through the OS
 * setting or through the site's own accessibility widget, which adds
 * `a11y-no-motion` to <html>.
 *
 * CSS alone can only flatten transitions; the rotating bars are driven by
 * `setInterval`, so they have to consult this and stop scheduling.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const root = document.documentElement;
    const read = () => setReduced(query.matches || root.classList.contains("a11y-no-motion"));

    read();
    query.addEventListener("change", read);
    const observer = new MutationObserver(read);
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });

    return () => {
      query.removeEventListener("change", read);
      observer.disconnect();
    };
  }, []);

  return reduced;
}
