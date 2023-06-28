import { defineStore } from "pinia";
import { db } from "../boot/fire";
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit,
} from "firebase/firestore";

const photosRef = collection(db, "Photo");

export const useCrudStore = defineStore("crud", {
  state: () => ({
    uploaded: [],
    objects: [],
    current: {},
  }),
  actions: {
    async fetch() {
      this.objects = [];
      const q = query(photosRef, orderBy("date", "desc"), limit(10));
      const querySnapshot = await getDocs(q);
      querySnapshot.forEach((doc) => {
        // doc.data() is never undefined for query doc snapshots
        this.objects.push(doc.data());
      });
    },
  },
  persist: {
    key: "c",
    paths: ["uploaded", "objects"],
    // beforeRestore: (context) => {
    //   console.log("Before hydration...", context);
    // },
    // afterRestore: (context) => {
    //   console.log("After hydration...", context);
    // },
  },
});
