// Only return to known local pages after sign-in; never follow an external URL.
export function safeReturnPath(value: unknown): string {
  if (
    typeof value !== "string" ||
    value.length > 4096 ||
    !value.startsWith("/") ||
    /[\\\u0000-\u001f\u007f]/.test(value)
  )
    return "/";
  try {
    const url = new URL(value, "https://local.invalid");
    if (
      url.origin !== "https://local.invalid" ||
      !/^(?:\/|\/entities(?:\/[A-Z0-9]{20})?|\/changes|\/users\/list)$/.test(
        url.pathname,
      )
    )
      return "/";
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return "/";
  }
}
