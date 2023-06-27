import { defineStore } from "pinia";

export const usePopupStore = defineStore("popup", {
  state: () => ({
    showEdit: false,
  }),
});
