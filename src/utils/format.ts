
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