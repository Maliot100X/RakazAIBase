export const BOTTOM_NAV = [
  { href: "/explore", label: "Explore", icon: "compass" },
  { href: "/games", label: "Games", icon: "gamepad" },
  { href: "/launch", label: "Launch", icon: "rocket", fab: true },
  { href: "/talk", label: "Talk", icon: "talk" },
  { href: "/agents/me", label: "Me", icon: "user" },
] as const;

/** Drawer: each route once (SHELLS §2 cleanup). Phase 0 = existing + stub routes only. */
export const DRAWER_GROUPS = [
  { title: "Her world", links: [["Home", "/"], ["Talk", "/talk"], ["Explore", "/explore"], ["Community", "/community"]] },
  { title: "Launch", links: [["Launch", "/launch"], ["Self-launch", "/self-launch"]] },
  { title: "Join", links: [["Agents", "/agents"], ["My agent", "/agents/me"], ["Register", "/register"], ["Agent login", "/agents/login"]] },
  { title: "Games", links: [["Games", "/games"], ["Leaderboard", "/leaderboard"]] },
  { title: "More", links: [["Diary", "/diary"], ["Memes", "/memes"], ["Giveaway", "/giveaway"], ["Stake", "/stake"], ["Roadmap", "/roadmap"], ["Studio", "/studio"], ["Docs", "/docs"]] },
  { title: "Operate", links: [["Scanner", "/scanner"], ["Shield", "/shield"], ["Trade", "/trade"], ["Pool", "/pool"], ["Vanity", "/vanity"], ["Kit", "/kit"], ["Lab", "/lab"], ["Infra", "/infra"], ["Dev", "/dev"], ["Settings", "/settings"], ["Integrations", "/settings/integrations"]] },
  { title: "System", links: [["Health", "/health"]] },
] as const;
