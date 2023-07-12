/* eslint-disable no-unused-vars */
import { defineStore } from "pinia";
import { CONFIG, emailNick, removeHash } from "../helpers";
import api from "../helpers/api";
import notify from "../helpers/notify";
import pushMessage from "../helpers/push";
import { useAuthStore } from "./auth";
import querystring from "querystring-es3";

export const useAppStore = defineStore("app", {
  state: () => ({
    find: {},

    uploaded: [],

    bucket: {
      size: 0,
      count: 0,
    },
    values: {},

    objects: [],
    pages: [],
    next: null,
    error: null,
    current: null,

    busy: false,
    showEdit: false,
    showConfirm: false,
    showCarousel: false,
    tagsToApply: [],
  }),
  getters: {
    last: (state) => {
      if (state.values && state.values.year && state.values.email) {
        let last = state.values.year[0];
        last.href = "/list?year=" + last.value;
        const auth = useAuthStore();
        if (auth.user.email) {
          const find = state.values.email.find(
            (el) => el.value === auth.user.email
          );
          if (find) {
            last = find;
            last.href = "/list?nick=" + emailNick(last.value);
          }
        }
        return last;
      }
      return {
        href: "/",
      };
    },
    counter: (state) => {
      return { count: state.objects.length, more: state.next };
    },
    // values getters
    tagValues: (state) => {
      if (state.values && state.values.tags) {
        return state.values.tags.map((obj) => obj.value);
      }
      return [];
    },
    modelValues: (state) => {
      if (state.values && state.values.model) {
        return state.values.model.map((obj) => obj.value);
      }
      return [];
    },
    lensValues: (state) => {
      if (state.values && state.values.lens) {
        return state.values.lens.map((obj) => obj.value);
      }
      return [];
    },
    nickValues: (state) => {
      if (state.values && state.values.email) {
        return state.values.email.map((obj) => emailNick(obj.value));
      }
      return [];
    },
    emailValues: (state) => {
      if (state.values && state.values.email) {
        return state.values.email.map((obj) => obj.value);
      }
      return [];
    },
    nickCountValues: (state) => {
      if (state.values && state.values.email) {
        return state.values.email.map((obj) => {
          return { value: emailNick(obj.value), count: obj.count };
        });
      }
      return [];
    },
    yearValues: (state) => {
      if (state.values && state.values.year) {
        return state.values.year.map((obj) => {
          return { label: "" + obj.value, value: obj.value };
        });
      }
      return [];
    },
    groupObjects: (state) => {
      const groups = [];
      for (let i = 0; i < state.objects.length; i += CONFIG.group) {
        groups.push(state.objects.slice(i, i + CONFIG.group));
      }
      return groups;
    },
  },
  actions: {
    deleteUploaded(obj) {
      const idx = this.uploaded.findIndex(
        (item) => item.filename === obj.filename
      );
      if (idx > -1) this.uploaded.splice(idx, 1);
      if (this.uploaded.length === 0 && this.showCarousel) {
        this.showCarousel = false;
        removeHash();
      }
    },
    async bucketInfo(param) {
      /**
       * param: { verb: 'add|del|get', [size: int] }
       */
      let response;
      if (param.verb === "get") {
        response = await api.get(param.verb + "/bucket_info");
        this.bucket = { ...this.bucket, ...response.data };
      } else {
        response = await api.put(param.verb + "/bucket_info", param);
        if (param.verb === "set") {
          const auth = useAuthStore();
          pushMessage(auth.fcm_token, "Cloud Bucket Info done");
        }
        this.bucket = { ...this.bucket, ...response.data };
      }
    },
    saveRecord(obj) {
      if (obj.id) {
        api.put("edit/" + obj.id, obj).then((response) => {
          const obj = response.data.rec;
          if (this.objects && this.objects.length) {
            const idx = this.objects.findIndex((item) => item.id === obj.id);
            this.objects.splice(idx, 1, obj);
            notify({ message: `${obj.filename} updated` });
          }
        });
      } else {
        // publish
        api.put("edit", obj).then((response) => {
          const obj = response.data.rec;
          const diff = { verb: "add", size: obj.size };
          // addRecord
          const dates = this.objects.map((item) => item.date);
          const idx = dates.findIndex((date) => date < obj.date);
          this.objects.splice(idx, 0, obj);

          this.deleteUploaded(obj);
          this.bucketInfo(diff);
        });
      }
    },
    deleteRecord(obj) {
      notify({
        group: `${obj.filename}`,
        message: `About to delete`,
      });
      if (obj.id) {
        api
          .delete("delete/" + obj.id, { data: { foo: "bar" } })
          .then((response) => {
            if (response.data) {
              const diff = { verb: "del", size: obj.size };
              notify({
                group: `${obj.filename}`,
                message: `${obj.filename} deleted`,
              });
              const idx = this.objects.findIndex((item) => item.id === obj.id);
              if (idx > -1) this.objects.splice(idx, 1);

              this.fetchStat();
              this.bucketInfo(diff);
            }
          })
          .catch((err) => {
            notify({
              group: `${obj.filename}`,
              type: "negative",
              message: "Failed to delete.",
            });
          });
      } else {
        api
          .delete("remove/" + obj.filename, { data: { foo: "bar" } })
          .then((response) => {
            if (response.data) {
              notify({
                group: `${obj.filename}`,
                message: `${obj.filename} deleted`,
              });
              this.deleteUploaded(obj);
            }
          })
          .catch((err) => {
            notify({
              group: `${obj.filename}`,
              type: "negative",
              message: "Failed to delete.",
            });
          });
      }
    },
    resetObjects() {
      this.objects.length = 0;
      this.pages.length = 0;
      this.next = null;
    },
    updateObjects(data) {
      if (this.pages[0] === "FP" && data._page === "FP") return;
      this.objects = [...this.objects, ...data.objects];
      this.pages = [...this.pages, data._page];
      this.next = data._next;
    },
    fetchRecords(reset = false, invoked = "") {
      if (this.busy) {
        if (process.env.DEV) console.log("SKIPPED FOR " + invoked);
        return;
      }
      const params = Object.assign({}, this.find, { per_page: CONFIG.limit });
      if (this.next && !reset) params._page = this.next;
      const url = "search?" + querystring.stringify(params);

      this.error = null;
      this.busy = true;
      api
        .get(url)
        .then((response) => {
          if (response.error) {
            this.error = response.error;
          } else if (
            response.data.objects &&
            response.data.objects.length === 0
          ) {
            this.error = 0;
          }
          if (reset) this.resetObjects(); // late reset
          this.updateObjects(response.data);
          this.busy = false;
          if (process.env.DEV)
            console.log(
              "FETCHED FOR " + invoked + " " + JSON.stringify(this.find)
            );
        })
        .catch((err) => {
          notify({ type: "negative", message: err.message });
          this.busy = false;
        });
    },
    fetchStat() {
      api.get("counters").then((response) => {
        this.values = response.data;
        // dispatch bucketInfo
        if (this.bucket.count === 0) {
          this.bucketInfo({ verb: "set" });
        } else {
          this.bucketInfo({ verb: "get" });
        }
      });
    },
  },
  persist: {
    key: "a",
    paths: [
      "find",
      "bucket",
      "values",
      "uploaded",
      "objects",
      "pages",
      "next",
      "tagsToApply",
    ],
    // beforeRestore: (context) => {
    //   console.log("Before hydration...", context);
    // },
    // afterRestore: (context) => {
    //   console.log("After hydration...", context);
    // },
  },
});
