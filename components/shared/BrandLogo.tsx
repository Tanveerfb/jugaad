import Image from "next/image";
import appConfig from "@/app.config";

type BrandLogoProps = {
  variant?: "icon" | "full";
  className?: string;
};

export default function BrandLogo({
  variant = "full",
  className,
}: BrandLogoProps) {
  const src = variant === "icon" ? appConfig.logo.icon : appConfig.logo.full;
  return (
    <Image
      src={src}
      alt={appConfig.logo.alt}
      width={variant === "icon" ? 32 : 120}
      height={32}
      className={className}
      priority
    />
  );
}
