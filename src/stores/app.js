import { defineStore } from "pinia";
import { db, storage } from "../boot/fire";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { ref, listAll, getMetadata, getDownloadURL } from "firebase/storage";
import readExif from "../helpers/exif";

const docRef = doc(db, "Bucket", "total");

export const useAppStore = defineStore("app", {
  state: () => ({
    bucket: {
      size: 0,
      count: 0,
    },
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
    async readBucketInfo() {
      // if (this.bucket.count === 0) {
      //   this.bucketInfoNew();
      // }
      const docSnap = await getDoc(docRef);
      this.bucket = { ...docSnap.data() };
    },
    async bucketInfoNew() {
      const res = {
        count: 0,
        size: 0,
      };
      const refs = await listAll(ref(storage, ""));
      for (let r of refs.items) {
        const meta = await getMetadata(r);
        if (meta.contentType === "image/jpeg") {
          res.count++;
          res.size += meta.size;
        }
      }
      this.bucket = { ...res };
      setDoc(docRef, res, { merge: true });
    },
  },
});
