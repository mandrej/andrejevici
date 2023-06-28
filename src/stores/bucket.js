import { defineStore } from "pinia";
import { db, storage } from "../boot/fire";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { ref as storageRef, listAll, getMetadata } from "firebase/storage";

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
    async diff(num) {
      const docSnap = await getDoc(docRef);
      const data = docSnap.data();
      if (num > 0) {
        this.bucket = {
          size: data.size + num,
          count: data.count + 1,
        };
      } else {
        this.bucket = {
          size: data.size - num,
          count: data.count - 1,
        };
      }
      await updateDoc(docRef, this.bucket);
    },
    async scretch() {
      const res = {
        count: 0,
        size: 0,
      };
      const refs = await listAll(storageRef(storage, ""));
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
  persist: {
    key: "a",
    paths: ["bucket"],
  },
});
