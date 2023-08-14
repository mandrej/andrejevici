import { QInput, QSelect, Notify } from "quasar";

const setDefault = (component, key, value) => {
  const prop = component.props[key];
  switch (typeof prop) {
    case "object":
      prop.default = value;
      break;
    case "function":
      component.props[key] = {
        type: prop,
        default: value,
      };
      break;
    case "undefined":
      throw new Error("unknown prop: " + key);
      break;
    default:
      throw new Error("unhandled type: " + typeof prop);
      break;
  }
};

setDefault(QInput, "clearIcon", "clear");
setDefault(QSelect, "clearIcon", "clear");
Notify.setDefaults({
  type: "info",
  position: "bottom",
  timeout: 5000,
});
