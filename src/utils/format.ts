
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
  // if (value < 1024) {
  //   return "1 File";
  // } else if (value < 1024 * 1024) {
  //   return Math.round(value / Math.pow(1024, 1)) + " Files";
  //  } //else if (value < 1024 * 1024 * 1024) {
  //   return Math.round(value / Math.pow(1024, 2)) + " MB";
  // } else if (value < 1024 * 1024 * 1024 * 1024) {
  //   return Math.round(value / Math.pow(1024, 3)) + " GB";
  // } else if (value < 1024 * 1024 * 1024 * 1024 * 1024) {
  //   return Math.round(value / Math.pow(1024, 4)) + " TB";
  // }

  return value + " Files";
}