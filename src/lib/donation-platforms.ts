export type DonationPlatform = {
  id: string;
  name: string;
  color: string;
  textColor: string;
  placeholder: string;
};

export const DONATION_PLATFORMS: DonationPlatform[] = [
  {
    id: "patreon",
    name: "Patreon",
    color: "bg-[#FF424D]/15 border-[#FF424D]/40",
    textColor: "text-[#FF424D]",
    placeholder: "https://patreon.com/tu-usuario",
  },
  {
    id: "kofi",
    name: "Ko-fi",
    color: "bg-[#29ABE0]/15 border-[#29ABE0]/40",
    textColor: "text-[#29ABE0]",
    placeholder: "https://ko-fi.com/tu-usuario",
  },
  {
    id: "buymeacoffee",
    name: "Buy Me a Coffee",
    color: "bg-[#FFDD00]/15 border-[#FFDD00]/40",
    textColor: "text-[#FFDD00]",
    placeholder: "https://buymeacoffee.com/tu-usuario",
  },
  {
    id: "paypal",
    name: "PayPal",
    color: "bg-[#003087]/15 border-[#003087]/40",
    textColor: "text-[#0070E0]",
    placeholder: "https://paypal.me/tu-usuario",
  },
  {
    id: "cafecito",
    name: "Cafecito",
    color: "bg-[#F5A623]/15 border-[#F5A623]/40",
    textColor: "text-[#F5A623]",
    placeholder: "https://cafecito.app/tu-usuario",
  },
  {
    id: "mercadopago",
    name: "Mercado Pago",
    color: "bg-[#00B1EA]/15 border-[#00B1EA]/40",
    textColor: "text-[#00B1EA]",
    placeholder: "https://link.mercadopago.com/tu-usuario",
  },
  {
    id: "apoiase",
    name: "Apoia.se",
    color: "bg-[#548CFF]/15 border-[#548CFF]/40",
    textColor: "text-[#548CFF]",
    placeholder: "https://apoia.se/tu-usuario",
  },
  {
    id: "fanbox",
    name: "Pixiv FANBOX",
    color: "bg-[#1E9ACC]/15 border-[#1E9ACC]/40",
    textColor: "text-[#1E9ACC]",
    placeholder: "https://tu-usuario.fanbox.cc",
  },
  {
    id: "fantia",
    name: "Fantia",
    color: "bg-[#FF5A79]/15 border-[#FF5A79]/40",
    textColor: "text-[#FF5A79]",
    placeholder: "https://fantia.jp/fanclubs/tu-id",
  },
  {
    id: "postype",
    name: "Postype",
    color: "bg-[#FF7A3D]/15 border-[#FF7A3D]/40",
    textColor: "text-[#FF7A3D]",
    placeholder: "https://postype.com/@tu-usuario",
  },
  {
    id: "afdian",
    name: "Afdian (爱发电)",
    color: "bg-[#946CE6]/15 border-[#946CE6]/40",
    textColor: "text-[#946CE6]",
    placeholder: "https://afdian.com/@tu-usuario",
  },
];

export function getPlatform(id: string): DonationPlatform | undefined {
  return DONATION_PLATFORMS.find((p) => p.id === id);
}
