import { defineStore } from "pinia";
import { storage } from "../boot/fire";
import { ref, listAll, getMetadata, getDownloadURL } from "firebase/storage";
import readExif from "../helpers/exif";

export const useCrudStore = defineStore("crud", {
  state: () => ({
    uploaded: [],
    objects: [],
  }),
  actions: {
    async fetch() {
      const refs = await listAll(ref(storage, ""));
      for (let r of refs.items) {
        const meta = await getMetadata(r);
        if (meta.contentType === "image/jpeg") {
          const url = await getDownloadURL(r);
          const out = await readExif(url);
          this.objects.push({ url: url, name: meta.name, ...out });
        }
      }
    },
  },
});
