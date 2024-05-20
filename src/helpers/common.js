import { scroll } from "quasar";
import { reFilename, fakeHistory } from "./index";
import { useAppStore } from "../stores/app";

const app = useAppStore();
const { getScrollTarget, setVerticalScrollPosition } = scroll;

// used in List-Page, Add-Page
export function useCarouselShow(filename) {
  app.currentFileName = filename;
  fakeHistory();
  app.showCarousel = true;
}

/**
 * Cancels the carousel by hiding it and scrolling to the top of the element with the given ID.
 *
 * @param {string} hash - The hash string containing the ID of the element to scroll to.
 * @return {void} This function does not return anything.
 */
export function useCarouselCancel(hash) {
  app.showCarousel = false;
  const [, id] = hash.match(reFilename);
  const el = document.getElementById(id);
  if (!el) return;

  const target = getScrollTarget(el);
  window.requestAnimationFrame(() =>
    setVerticalScrollPosition(target, el.offsetTop, 0)
  );
}
