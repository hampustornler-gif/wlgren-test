const PUBLIC_APP_ORIGIN = "https://tornler.com";

export function buildPublicUrl(path = "/") {
  return new URL(path, PUBLIC_APP_ORIGIN).toString();
}

export function buildInviteUrl(token: string) {
  return buildPublicUrl(`/invite/${token}`);
}