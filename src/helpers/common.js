import { nextTick } from "vue";
import { scroll } from "quasar";
import { reFilename, fakeHistory, removeHash } from "./index";
import { useAppStore } from "../stores/app";
import { useValuesStore } from "../stores/values";

const app = useAppStore();
const meta = useValuesStore();
import notify from "../helpers/notify";
const { getScrollTarget, setVerticalScrollPosition } = scroll;

// used in Browser-Page, Add-Page
export function useCarouselShow(filename) {
  app.markerFileName = filename;
  fakeHistory();
  app.showCarousel = true;
}

export function useCarouselCancel(hash) {
  const [, id] = hash.match(reFilename);
  app.busy = true;
  nextTick(() => {
    const el = document.getElementById(id);
    if (!el) return;
    const target = getScrollTarget(el);
    setVerticalScrollPosition(target, el.offsetTop, 400);
    removeHash();
    app.busy = false;
  });
}

export const rename = async (field, existing, changed) => {
  if (existing !== "" && changed !== "") {
    if (
      (field === "tags" && existing === "flash") ||
      (field === "model" && existing === "UNKNOWN")
    ) {
      notify({
        type: "warning",
        message: `Cannot change "${existing}"`,
      });
    } else if (Object.keys(meta.values[field]).indexOf(changed) !== -1) {
      notify({
        type: "warning",
        message: `"${changed}" already exists"`,
      });
    } else {
      await meta.renameValue(field, existing, changed);
      notify({
        message: `${existing} successfully renamed to ${changed}`,
      });
    }
  }
};
