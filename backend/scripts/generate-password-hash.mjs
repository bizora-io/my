// Usage: node backend/scripts/generate-password-hash.mjs "your password"
// Prints a bcrypt hash to paste into SAAS_OWNER_PASSWORD_HASH in backend/.env
import bcrypt from "bcryptjs";

const password = process.argv[2];
if (!password) {
  console.error('Usage: node generate-password-hash.mjs "your password"');
  process.exit(1);
}

const hash = bcrypt.hashSync(password, 10);
console.log(hash);
