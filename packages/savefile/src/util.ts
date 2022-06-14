export const isEmpty = (v: any): boolean => {
  if (Array.isArray(v)) {
    return v.length === 0;
  }
  if (typeof v === "object") {
    return Object.keys(v).length === 0;
  }

  1;
  if (typeof v === "string") {
    return v.length === 0;
  }

  return v === undefined || v === null;
};
