import exifReader from "exifreader";
import { has } from "lodash";
import { formatDatum } from "./index";

const LENSES = {
  "Nikon NIKKOR Z 24-70mm f4 S": "NIKKOR Z 24-70mm f4 S",
  "70-300 mm f4.5-5.6": "70.0-300.0 mm f4.5-5.6",
  "VR 70-300mm f4.5-5.6E": "70.0-300.0 mm f4.5-5.6",
  "Canon EF-S 17-55mm f2.8 IS USM": "EF-S17-55mm f2.8 IS USM",
  "Canon EF 100mm f2.8 Macro USM": "EF100mm f2.8 Macro USM",
  "Canon EF 50mm f1.8 STM": "EF50mm f1.8 STM",
};

const readExif = async (url) => {
  const result = { model: "UNKNOWN", date: formatDatum(new Date()) };
  const tags = await exifReader.load(url, { expanded: true });
  if (tags.exif) delete tags.exif["MakerNote"];
  if (tags.Thumbnail) delete tags.Thumbnail;
  if (tags.icc) delete tags.icc;
  if (tags.iptc) delete tags.iptc;
  if (tags.xmp) delete tags.xmp;

  // EXIF
  const exif = tags.exif;
  // console.log(exif.LensModel);
  if (has(exif, "Make") && has(exif, "Model")) {
    const make = exif.Make.description.replace("/", "");
    const model = exif.Model.description.replace("/", "");
    const makelArr = make.split(" ");
    const modelArr = model.split(" ");
    for (let it of makelArr) {
      if (modelArr.includes(it)) {
        result.model = model;
        break;
      } else {
        result.model = make + " " + model;
      }
    }
  }
  if (has(exif, "LensModel")) {
    const lens = exif.LensModel.description.replace("/", "");
    result.lens = LENSES[lens] || lens;
  }
  if (has(exif, "DateTimeOriginal")) {
    const rex = new RegExp(/(\d{4}):(\d{2}):(\d{2})/i);
    const date = exif.DateTimeOriginal.description.replace(rex, "$1-$2-$3");
    if (process.env.DEV) console.log("EXIF DATE " + date);
    const datum = new Date(Date.parse(date));
    result.date = formatDatum(datum);
    result.year = datum.getFullYear();
    result.month = datum.getMonth() + 1;
    result.day = datum.getDate();
  }
  if (has(exif, "ApertureValue"))
    result.aperture = parseFloat(exif.ApertureValue.description);
  if (has(exif, "ExposureTime")) {
    const shutter = exif.ExposureTime.value[0] / exif.ExposureTime.value[1];
    if (shutter <= 0.1) {
      result.shutter = "1/" + parseInt(1 / shutter);
    } else {
      result.shutter = "" + shutter;
    }
  }
  if (has(exif, "FocalLength"))
    result.focal_length = parseInt(exif.FocalLength.description);
  if (has(exif, "ISOSpeedRatings"))
    result.iso = exif.ISOSpeedRatings.description;
  if (has(exif, "Flash"))
    result.flash = exif.Flash.description.startsWith("Flash did not")
      ? false
      : true;

  // DIMENSIONS
  if (has(tags.file, "Image Height") && has(tags.file, "Image Width")) {
    result.dim = [
      tags.file["Image Width"].value,
      tags.file["Image Height"].value,
    ];
  }

  // GPS
  // console.log(tags.gps);
  if (has(tags.gps, "Latitude") && has(tags.gps, "Longitude")) {
    result.loc =
      "" + tags.gps.Latitude.toFixed(6) + ", " + tags.gps.Longitude.toFixed(6);
  }

  // console.log(result);
  return result;
};

export default readExif;
