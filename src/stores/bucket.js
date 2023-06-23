import { defineStore } from "pinia";
import { db, storage } from "../boot/fire";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { ref, listAll, getMetadata } from "firebase/storage";

const docRef = doc(db, "Bucket", "total");

export const useBucketStore = defineStore("bucket", {
  state: () => ({
    bucket: {
      size: 0,
      count: 0,
    },
  }),
  actions: {
    async read() {
      // if (this.bucket.count === 0) {
      //   this.bucketInfoNew();
      // }
      const docSnap = await getDoc(docRef);
      this.bucket = { ...docSnap.data() };
    },
    async scretch() {
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
