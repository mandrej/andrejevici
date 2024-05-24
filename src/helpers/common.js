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

export function useCarouselCancel(hash) {
  app.showCarousel = false;
  const [, id] = hash.match(reFilename);
  setTimeout(() => {
    const el = document.getElementById(id);
    if (!el) return;
    const target = getScrollTarget(el);
    setVerticalScrollPosition(target, el.offsetTop, 400);
  }, 100);
}
