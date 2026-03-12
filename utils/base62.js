const chars = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

function encodeBase62(counter) {
  if (counter === 0) return "0";
  let str = "";

  while (counter > 0) {
    str = chars[counter % 62] + str;
    counter = Math.floor(counter / 62);
  }

  return str;
}

module.exports = encodeBase62