
function getMongoUri() {
  if (process.env.NODE_ENV === "production") {
    if (!process.env.DATABASE || !process.env.DATABASE_PASSWORD) {
      throw new Error("Missing DATABASE or DATABASE_PASSWORD in .env");
    }
    return process.env.DATABASE.replace(
      "<PASSWORD>",
      process.env.DATABASE_PASSWORD,
    );
  }
  if (!process.env.DATABASE_LOCAL) {
    throw new Error("Missing DATABASE_LOCAL in .env");
  }
  return process.env.DATABASE_LOCAL;
}

module.exports = { getMongoUri };