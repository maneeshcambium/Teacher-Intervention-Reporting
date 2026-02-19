/**
 * Cambium Assessment logo — uses the official cambium-logo.svg asset.
 * Inverted to white for dark backgrounds via CSS filter.
 */
import Image from "next/image";

export function CambiumLogo({ className = "" }: { className?: string }) {
  return (
    <Image
      src="/cambium-logo.svg"
      alt="Cambium Assessment"
      width={180}
      height={40}
      className={`brightness-0 invert ${className}`}
      priority
    />
  );
}
