/** Duração de uma faixa no formato "m:ss" (ex.: 225000 → "3:45"). */
export function formatTrackDuration(durationMs: number | null): string {
  if (durationMs === null) return "—";

  const totalSeconds = Math.round(durationMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

/** Duração total de um álbum (ex.: 3640000 → "1 h 1 min", 2700000 → "45 min"). */
export function formatAlbumDuration(durationMs: number): string {
  const totalMinutes = Math.round(durationMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes} min`;
  return minutes === 0 ? `${hours} h` : `${hours} h ${minutes} min`;
}

const releaseDateFormat = new Intl.DateTimeFormat("pt-BR", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

/** Data de lançamento "AAAA-MM-DD" por extenso (ex.: "7 de março de 2001"). */
export function formatReleaseDate(releaseDate: string): string {
  const [year, month, day] = releaseDate.split("-").map(Number);
  return releaseDateFormat.format(new Date(Date.UTC(year, month - 1, day)));
}
const relativeTimeFormat = new Intl.RelativeTimeFormat("pt-BR", { numeric: "always" });

const RELATIVE_UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 365 * 24 * 60 * 60],
  ["month", 30 * 24 * 60 * 60],
  ["day", 24 * 60 * 60],
  ["hour", 60 * 60],
  ["minute", 60],
];

/** Tempo desde uma data ISO (ex.: "há 2 dias", "há 3 horas", "agora"). */
export function formatRelativeDate(isoDate: string, now: Date = new Date()): string {
  const seconds = Math.round((new Date(isoDate).getTime() - now.getTime()) / 1000);
  for (const [unit, unitSeconds] of RELATIVE_UNITS) {
    if (Math.abs(seconds) >= unitSeconds) {
      return relativeTimeFormat.format(Math.round(seconds / unitSeconds), unit);
    }
  }
  return "agora";
}
const monthYearFormat = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" });

/** Mês e ano de uma data ISO (ex.: "outubro de 2026"), usado em "Membro desde". */
export function formatMonthYear(isoDate: string): string {
  return monthYearFormat.format(new Date(isoDate));
}
