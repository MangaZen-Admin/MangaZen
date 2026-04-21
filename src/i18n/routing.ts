import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["es-ar", "es-es", "en-us", "en-gb", "pt-br", "ja-jp", "ko-kr", "zh-cn"],
  defaultLocale: "es-ar",
  localePrefix: "always",
});
