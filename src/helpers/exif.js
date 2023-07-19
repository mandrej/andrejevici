import exifr from "exifr";
import { has } from "lodash";
import { date } from "quasar";
import { formatDatum } from "./index";

const values = [
  "Make",
  "Model",
  "LensModel",
  "DateTimeOriginal",
  "FNumber",
  "ExposureTime",
  "FocalLength",
  "ISO",
  "Flash",
  "GPSLatitude",
  "GPSLatitudeRef",
  "GPSLongitude",
  "GPSLongitudeRef",
];
const LENSES = {
  "Nikon NIKKOR Z 24-70mm f4 S": "NIKKOR Z 24-70mm f4 S",
  "70-300 mm f4.5-5.6": "70.0-300.0 mm f4.5-5.6",
  "Canon EF-S 17-55mm f2.8 IS USM": "EF-S17-55mm f2.8 IS USM",
  "Canon EF 100mm f2.8 Macro USM": "EF100mm f2.8 Macro USM",
  "Canon EF 50mm f1.8 STM": "EF50mm f1.8 STM",
};
const decimal_coords = (coords, gpsRef) => {
  let decimal_degrees = coords[0] + coords[1] / 60 + coords[2] / 3600;
  if (gpsRef == "S" || gpsRef == "W") decimal_degrees = -decimal_degrees;
  return decimal_degrees;
};

const readExif = async (url) => {
  const exif = { model: "UNKNOWN", date: new Date() };
  const data = await exifr.parse(url, values);
  // console.log(data);

  if (has(data, "Make") && has(data, "Model")) {
    const make = data.Make.replace("/", "");
    const model = data.Model.replace("/", "");
    const makelArr = make.split(" ");
    const modelArr = model.split(" ");
    for (let it of makelArr) {
      if (modelArr.includes(it)) {
        exif.model = model;
        break;
      } else {
        exif.model = make + " " + model;
      }
    }
  }
  if (has(data, "LensModel")) {
    exif.lens = data.LensModel.replace("/", "");
  }
  if (has(data, "DateTimeOriginal")) {
    const datum = new Date(Date.parse(data.DateTimeOriginal));
    console.log(typeof datum);
    exif.date = formatDatum(data.DateTimeOriginal);
    exif.year = datum.getFullYear();
    exif.month = datum.getMonth() + 1;
    exif.day = datum.getDate();
  }
  if (has(data, "FNumber")) exif.aperture = data.FNumber;
  if (has(data, "ExposureTime")) {
    if (data.ExposureTime <= 0.1) {
      exif.shutter = "1/" + parseInt(1 / data.ExposureTime);
    } else {
      exif.shutter = "" + data.ExposureTime;
    }
  }
  if (has(data, "FocalLength")) exif.focal_length = parseInt(data.FocalLength);
  if (has(data, "ISO")) exif.iso = data.ISO;
  if (has(data, "Flash"))
    exif.flash = data.Flash === "Flash did not fire" ? false : true;
  if (
    has(data, "GPSLatitude") &&
    has(data, "GPSLatitudeRef") &&
    has(data, "GPSLongitude") &&
    has(data, "GPSLongitudeRef")
  )
    exif.loc = [
      decimal_coords(data.GPSLatitude, data.GPSLatitudeRef),
      decimal_coords(data.GPSLongitude, data.GPSLongitudeRef),
    ];

  // console.log(exif);
  return exif;
};

export default readExif;
