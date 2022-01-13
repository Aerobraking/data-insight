
export const filesizeFormat = (value: number) => {
  value = Math.round(value);
  if (value < 1024) {
    return "1 MB";
  } else if (value < 1024 * 1024) {
    return Math.round(value / Math.pow(1024, 1)) + " KB";
  } else if (value < 1024 * 1024 * 1024) {
    return Math.round(value / Math.pow(1024, 2)) + " MB";
  } else if (value < 1024 * 1024 * 1024 * 1024) {
    return Math.round(value / Math.pow(1024, 3)) + " GB";
  } else if (value < 1024 * 1024 * 1024 * 1024 * 1024) {
    return Math.round(value / Math.pow(1024, 4)) + " TB";
  }

  return value + " Bytes";
};
function sformat(s: number) {
  var fm = [
    Math.floor(s / 60 / 60 / 24), // DAYS
    Math.floor(s / 60 / 60) % 24, // HOURS
    Math.floor(s / 60) % 60, // MINUTES
    s % 60 // SECONDS
  ];
  return fm.map((v: number, i: number) => { return ((v < 10) ? '0' : '') + v; }).join(':');
}
export const timeFormat = (value: number) => {
  value = Math.round(value);
  // return sformat(value);
  if (value < 0) {
    return "No Time";

  } else if (value == 0) {
    return "Present";

  } else if (value < 60) {
    return value + " Seconds";

  } else if (value < 60 * 60) {
    const v = (Math.floor(value / 60) % 60);
    return v + (v > 1 ? " Minutes" : " Minute");

  } else if (value < 60 * 60 * 24) {
    const v = (Math.floor(value / 60 / 60) % 24);
    return v + (v > 1 ? " Hours" : " Hour");

  } else if (value < 60 * 60 * 24 * 7) {
    const v = (Math.floor(value / 60 / 60 / 24));
    return v + (v > 1 ? " Days" : " Day");

  } else if (value < 60 * 60 * 24 * 31) {
    const v = (Math.floor(value / 60 / 60 / 24 / 7));
    return v + (v > 1 ? " Weeks" : " Week");

  } else if (value < 60 * 60 * 24 * 365) {
    const v = (Math.floor(value / 60 / 60 / 24 / 31));
    return v + (v > 1 ? " Months" : " Month");

  } else if (value >= 60 * 60 * 24 * 365) {
    const v = (Math.floor(value / 60 / 60 / 24 / 365));
    return v + (v > 1 ? " Years" : " Year");

  }

  return value + " Bytes";
};

export const fileamountFormat = (value: number) => {
  value = Math.round(value);
  if (value > 1000000) {
    value = Math.round(value / 10000) * 10000
  } else if (value > 100000) {
    value = Math.round(value / 1000) * 1000
  } else if (value > 10000) {
    value = Math.round(value / 100) * 100
  } else if (value > 1000) {
    value = Math.round(value / 10) * 10
  }

  function toCommas(value: number) {
    return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  }

  return (value >= 1000 ? toCommas(value) : value) + " Files";
}