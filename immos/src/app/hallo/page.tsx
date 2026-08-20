import { HalloBuehne } from "@/components/start/hallo-buehne";

export const metadata = { title: "Willkommen" };

/**
 * Einstiegsseite für Vorführungen: `/hallo` begrüßt standardmäßig Thomas,
 * `/hallo?name=Sandra` entsprechend anders.
 */
export default async function HalloSeite({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const roh = params?.name;
  const name = (Array.isArray(roh) ? roh[0] : roh)?.trim();
  const sicher = name && /^[\p{L}\s'-]{1,40}$/u.test(name) ? name : "Thomas";
  return <HalloBuehne name={sicher} />;
}
