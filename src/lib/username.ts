const internalDomain = "connect-centre.local";

export function normalizeUsername(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, ".");
}

export function usernameToEmail(value: string) {
  const username = normalizeUsername(value);
  return username.includes("@") ? username : `${username}@${internalDomain}`;
}

export function emailToUsername(value: string) {
  return value.toLowerCase().endsWith(`@${internalDomain}`) ? value.slice(0, -(internalDomain.length + 1)) : value;
}

export function isValidUsername(value: string) {
  return /^[a-z0-9][a-z0-9._-]{2,31}$/.test(normalizeUsername(value));
}
