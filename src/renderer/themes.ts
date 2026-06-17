import type { Theme } from "../content/types";

export const THEME_COLORS: Record<Theme, { fog: number; glass: number; crystal: number; accent: number }> = {
  crystalCavern: { fog: 0x21424a, glass: 0x4fb3a3, crystal: 0x7ffcd9, accent: 0xffd278 },
  neonTunnel: { fog: 0x140a2e, glass: 0x18e0ff, crystal: 0x18e0ff, accent: 0xff3df0 },
  glassChapel: { fog: 0xdfeafc, glass: 0xbcd4f5, crystal: 0xffffff, accent: 0xa9cfff },
};
