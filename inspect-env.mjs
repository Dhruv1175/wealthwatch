import "dotenv/config";
const url = process.env.DATABASE_URL;
console.log("RAW:", JSON.stringify(url));
console.log("Type:", typeof url);
if (url) {
  console.log("First char:", url[0]);
  console.log("Last char:", url[url.length-1]);
  console.log("Length:", url.length);
}