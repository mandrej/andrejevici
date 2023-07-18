import { defineStore } from "pinia";
import { db, storage } from "../boot/fire";
import {
  doc,
  collection,
  query,
  where,
  limit,
  orderBy,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  startAfter,
} from "firebase/firestore";
import { ref as storageRef, listAll, getMetadata } from "firebase/storage";

const docRef = doc(db, "Bucket", "total");
const photosRef = collection(db, "Photo");

export const useBucketStore = defineStore("bucket", {
  state: () => ({
    bucket: {
      size: 0,
      count: 0,
    },
  }),
  actions: {
    async read() {
      if (this.bucket.count === 0) {
        this.scretch();
      }
      const docSnap = await getDoc(docRef);
      this.bucket = { ...docSnap.data() };
    },
    async diff(num) {
      if (num > 0) {
        this.bucket.size += num;
        this.bucket.count++;
      } else {
        this.bucket.size -= num;
        this.bucket.count--;
      }
      if (this.bucket.count <= 0) {
        this.bucket.size = 0;
        this.bucket.count = 0;
      }
      await setDoc(docRef, this.bucket, { merge: true });
    },
    async scretch() {
      const res = {
        count: 0,
        size: 0,
      };
      const q = query(photosRef, orderBy("date", "desc"));
      const querySnapshot = await getDocs(q);
      if (querySnapshot.empty) return res;
      querySnapshot.forEach(async (it) => {
        res.count++;
        res.size += it.data().size;
      });
      console.log(res);
      // const refs = await listAll(storageRef(storage, ""));
      // for (let r of refs.items) {
      //   const meta = await getMetadata(r);
      //   if (meta.contentType === "image/jpeg") {
      //     res.size += meta.size;
      //     res.count++;
      //   }
      // }
      this.bucket = { ...res };
      await setDoc(docRef, res, { merge: true });
    },
  },
  persist: {
    key: "a",
    paths: ["bucket"],
  },
});
