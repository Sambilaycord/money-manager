import type { AccountType } from "./accounts";
import { accountColorOrDefault, type ColorSwatch } from "./colors";

export interface Brand {
  id: string;
  name: string;
  /** Lowercase words a person might type in an account name. */
  aliases: readonly string[];
  colors: readonly ColorSwatch[];
}

// Sampled from each brand's own material (app icon, logo file, or website
// CSS), not third-party colour sites, which often describe a different company
// with the same initials. Where an icon is a gradient (Metrobank, UnionBank,
// Landbank, GoTyme, UNO) the value is a pick from it, not an official spec.
export const PH_BRANDS: readonly Brand[] = [
  {
    id: "gcash",
    name: "GCash",
    aliases: ["gcash", "g-cash", "g cash", "mynt"],
    colors: [
      { hex: "#007CFF", label: "GCash Blue" },
      { hex: "#002CB8", label: "GCash Navy" },
    ],
  },
  {
    id: "maya",
    name: "Maya",
    aliases: ["maya", "paymaya", "pay maya", "maya bank", "maya wallet"],
    colors: [{ hex: "#2FF29E", label: "Maya Green" }],
  },
  {
    id: "gotyme",
    name: "GoTyme Bank",
    aliases: ["gotyme", "go tyme", "gotyme bank", "go tyme bank"],
    colors: [
      { hex: "#01F3FA", label: "GoTyme Cyan" },
      { hex: "#2D2D3A", label: "GoTyme Charcoal" },
    ],
  },
  {
    id: "maribank",
    name: "MariBank",
    // SeaBank PH rebranded as MariBank; seabank.ph now serves the MariBank site.
    aliases: ["maribank", "mari bank", "seabank", "sea bank"],
    colors: [
      { hex: "#EA5F00", label: "MariBank Orange" },
      { hex: "#2673DD", label: "MariBank Blue" },
    ],
  },
  {
    id: "bpi",
    name: "BPI",
    aliases: ["bpi", "bank of the philippine islands"],
    colors: [
      { hex: "#B11116", label: "BPI Red" },
      { hex: "#EA4444", label: "BPI Coral" },
    ],
  },
  {
    id: "bdo",
    name: "BDO",
    aliases: ["bdo", "bdo unibank", "banco de oro", "bdo pay"],
    colors: [
      { hex: "#014EA8", label: "BDO Blue" },
      { hex: "#FCB813", label: "BDO Gold" },
    ],
  },
  {
    id: "metrobank",
    name: "Metrobank",
    aliases: ["metrobank", "metro bank", "metropolitan bank", "mbtc"],
    colors: [
      { hex: "#3C6FC1", label: "Metrobank Blue" },
      { hex: "#7543AB", label: "Metrobank Violet" },
    ],
  },
  {
    id: "unionbank",
    name: "UnionBank",
    aliases: ["unionbank", "union bank", "ubp"],
    colors: [{ hex: "#FD7B09", label: "UnionBank Orange" }],
  },
  {
    id: "securitybank",
    name: "Security Bank",
    aliases: ["security bank", "securitybank"],
    colors: [
      { hex: "#314057", label: "Security Bank Navy" },
      { hex: "#93D50A", label: "Security Bank Green" },
    ],
  },
  {
    id: "landbank",
    name: "Landbank",
    aliases: ["landbank", "land bank", "lbp", "land bank of the philippines"],
    colors: [
      { hex: "#16B34A", label: "Landbank Green" },
      { hex: "#CDDC25", label: "Landbank Lime" },
    ],
  },
  {
    id: "pnb",
    name: "PNB",
    aliases: ["pnb", "philippine national bank"],
    colors: [
      { hex: "#072269", label: "PNB Navy" },
      { hex: "#D8282F", label: "PNB Red" },
    ],
  },
  {
    id: "rcbc",
    name: "RCBC",
    aliases: ["rcbc", "rizal commercial banking", "rcbc pulz"],
    colors: [{ hex: "#3783D9", label: "RCBC Blue" }],
  },
  {
    id: "chinabank",
    name: "China Bank",
    aliases: ["china bank", "chinabank", "china banking corporation", "my cbc"],
    colors: [{ hex: "#EE292B", label: "China Bank Red" }],
  },
  {
    id: "eastwest",
    name: "EastWest Bank",
    aliases: ["eastwest", "east west", "eastwest bank"],
    colors: [
      { hex: "#B2006F", label: "EastWest Magenta" },
      { hex: "#542785", label: "EastWest Purple" },
    ],
  },
  {
    id: "komo",
    name: "Komo",
    aliases: ["komo", "komo by eastwest"],
    colors: [
      { hex: "#AC1F63", label: "Komo Magenta" },
      { hex: "#6D2B51", label: "Komo Plum" },
    ],
  },
  {
    id: "cimb",
    name: "CIMB Bank",
    aliases: ["cimb", "cimb bank"],
    colors: [{ hex: "#DC241F", label: "CIMB Red" }],
  },
  {
    id: "tonik",
    name: "Tonik",
    aliases: ["tonik", "tonik bank", "tonikbank"],
    colors: [{ hex: "#785AFF", label: "Tonik Purple" }],
  },
  {
    id: "uno",
    name: "UNO Digital Bank",
    aliases: ["uno bank", "uno digital bank", "unobank"],
    colors: [
      { hex: "#6A08DC", label: "UNO Violet" },
      { hex: "#D304C3", label: "UNO Magenta" },
    ],
  },
  {
    id: "netbank",
    name: "Netbank",
    aliases: ["netbank", "net bank"],
    colors: [{ hex: "#0741AD", label: "Netbank Blue" }],
  },
  {
    id: "psbank",
    name: "PSBank",
    aliases: ["psbank", "ps bank", "philippine savings bank"],
    colors: [
      { hex: "#ED3132", label: "PSBank Red" },
      { hex: "#0055A5", label: "PSBank Blue" },
    ],
  },
  {
    id: "aub",
    name: "AUB",
    aliases: ["aub", "asia united bank"],
    colors: [
      { hex: "#D9B451", label: "AUB Gold" },
      { hex: "#ED1C24", label: "AUB Red" },
    ],
  },
  {
    id: "diskartech",
    name: "DiskarTech",
    aliases: ["diskartech", "diskar tech"],
    colors: [
      { hex: "#0EA8C4", label: "DiskarTech Teal" },
      { hex: "#F9AA16", label: "DiskarTech Amber" },
    ],
  },
  {
    id: "shopeepay",
    name: "ShopeePay",
    aliases: ["shopeepay", "shopee pay", "shopee", "spaylater"],
    colors: [{ hex: "#EE4D2D", label: "Shopee Orange" }],
  },
  {
    id: "grabpay",
    name: "GrabPay",
    aliases: ["grabpay", "grab pay", "grab"],
    colors: [{ hex: "#00B14F", label: "Grab Green" }],
  },
  {
    id: "coinsph",
    name: "Coins.ph",
    aliases: ["coins ph", "coinsph", "coins"],
    colors: [{ hex: "#0552D6", label: "Coins Blue" }],
  },
  {
    id: "wise",
    name: "Wise",
    aliases: ["wise", "transferwise"],
    colors: [
      { hex: "#9FE870", label: "Wise Bright Green" },
      { hex: "#163300", label: "Wise Forest Green" },
    ],
  },
  {
    id: "paypal",
    name: "PayPal",
    aliases: ["paypal", "pay pal"],
    colors: [
      { hex: "#003087", label: "PayPal Navy" },
      { hex: "#0070E0", label: "PayPal Blue" },
    ],
  },
];

function normalize(text: string): string {
  return ` ${text.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()} `;
}

/**
 * The bank or e-wallet an account name refers to, if any. Aliases match whole
 * words only, so "BPI Savings" finds BPI but "Kabpia" doesn't; when several
 * brands match, the longest alias wins ("bdo network bank" over "bdo").
 */
export function matchBrand(accountName: string, brands: readonly Brand[] = PH_BRANDS): Brand | null {
  const name = normalize(accountName);
  let best: { brand: Brand; length: number } | null = null;

  for (const brand of brands) {
    for (const alias of brand.aliases) {
      const needle = normalize(alias);
      if (name.includes(needle) && needle.length > (best?.length ?? 0)) {
        best = { brand, length: needle.length };
      }
    }
  }
  return best?.brand ?? null;
}

/**
 * The brand behind an account: its institution field first, then its name, so
 * "Taiwan Trip Savings" at "GoTyme" and a plain "GCash" account both resolve.
 */
export function brandForAccount(account: { name: string; institution: string | null }): Brand | null {
  return (account.institution && matchBrand(account.institution)) || matchBrand(account.name);
}

/**
 * The colour an account's card is painted. A saved colour always wins; accounts
 * saved without one (including every account created before colours existed)
 * take their brand's colour, then the default for their type.
 */
export function accountCardColor(account: {
  name: string;
  institution: string | null;
  type: AccountType;
  color: string | null;
}): string {
  if (account.color) return account.color;
  return brandForAccount(account)?.colors[0]?.hex ?? accountColorOrDefault(null, account.type);
}
