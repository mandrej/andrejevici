import { defineStore } from "pinia";
import { isEmpty } from "lodash";
import { db } from "../boot/fire";
import {
  doc,
  collection,
  query,
  orderBy,
  getDoc,
  setDoc,
  getDocs,
} from "firebase/firestore";
import notify from "../helpers/notify";

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
      if (isEmpty(this.bucket) || this.bucket.count === 0) {
        this.scretch();
      } else {
        const docSnap = await getDoc(docRef);
        this.bucket = { ...docSnap.data() };
      }
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
      if (!querySnapshot.empty) {
        querySnapshot.forEach(async (it) => {
          res.count++;
          res.size += it.data().size;
        });
      }
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
      notify({ message: `Bucket size and count recalculated` });
    },
  },
  persist: {
    key: "a",
    paths: ["bucket"],
  },
});
