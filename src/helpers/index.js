import CONFIG from "../../config.json";
import { date, format } from "quasar";
import { slugify } from "transliteration";
import { computed } from "vue";

const { humanStorageSize } = format;
const { formatDate } = date;

const months = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
// eslint-disable-next-line no-unused-vars
const formatBytes = (bytes, decimals = 2) => {
  return humanStorageSize(bytes);
};
const formatDatum = (str, format = CONFIG.dateFormat) => {
  const date = new Date(str);
  return formatDate(date, format);
};
const emailNick = (email) => {
  return email.match(/[^.@]+/)[0];
};
const fakeHistory = () => {
  window.history.pushState(history.state, null, history.state.current);
};
const removeHash = () => {
  window.history.replaceState(
    history.state,
    null,
    history.state.current.replace(/#(.*)?/, "")
  );
};
const version = computed(() => {
  const ver = process.env.ANDREJEVICI_VERSION.match(/.{1,4}/g).join(".");
  return "© 2007 - " + ver;
});
const removeByProperty = (arr, propery, value) => {
  const idx = arr.findIndex((it) => it[propery] === value);
  if (idx !== -1) arr.splice(idx, 1);
};
const textSlug = (text) => {
  // return slugify(text, { replace: [[/[\.|\:|-]/g, ""]] });
  return slugify(text, {
    replace: [
      ["ш", "s"],
      ["đ", "dj"],
      ["џ", "dz"],
      ["ћ", "c"],
      ["ч", "c"],
      ["ж", "z"],
      [/[\.-::^[0-9]]+/g, ""],
    ],
  });
};
const sliceSlug = (slug) => {
  const text = [];
  for (const word of slug.split("-")) {
    for (var j = 3; j < word.length + 1; j++) {
      const part = word.slice(0, j);
      if (part.length > 8) break;
      text.push(part);
    }
  }
  return text;
};

export const U = "_";
export const fileBroken = CONFIG.fileBroken;
export const reClean = new RegExp(/[\.\s()\[\]\\]+/g);
export const reFilename = new RegExp(/([^.]+)/g);
export const fullsized = "";
export const thumbName = (filename) => {
  const [name, ext] = filename.match(reFilename);
  return [CONFIG.thumbnails, name + "_400x400.jpeg"].join("/");
};
export const thumbUrl = (filename) => {
  return [
    "https://storage.googleapis.com",
    CONFIG.firebase.storageBucket,
    thumbName(filename),
  ].join("/");
};
export {
  CONFIG,
  months,
  formatBytes,
  formatDatum,
  emailNick,
  fakeHistory,
  removeHash,
  version,
  removeByProperty,
  textSlug,
  sliceSlug,
};
