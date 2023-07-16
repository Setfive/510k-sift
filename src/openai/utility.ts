export function nl2br(str: string) {
  if (typeof str === "undefined" || str === null) {
    return "";
  }
  const breakTag = "<br>";
  return (str + "").replace(
    /([^>\r\n]?)(\r\n|\n\r|\r|\n)/g,
    "$1" + breakTag + "$2"
  );
}
