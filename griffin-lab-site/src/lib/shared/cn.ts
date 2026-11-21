import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Concatène des classes Tailwind ; en cas de conflit, la dernière l'emporte. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
