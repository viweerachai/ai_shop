import { config } from "../config.js";
import { createRepos } from "../sheets/repos.js";

if (!config.hasGoogleCredentials) {
  throw new Error("Google Sheets credentials are not configured.");
}
const repos = createRepos();
const products = await repos.rawProducts.all();
console.log(`Google Sheets connection OK. raw_products rows: ${products.length}`);
