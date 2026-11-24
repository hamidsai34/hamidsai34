import type { MetadataRoute } from "next";

/** Lets the site be installed on Android (Chrome: menu > "Installer l'application" / "Ajouter à l'écran d'accueil"). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "gestionauto.ma",
    short_name: "gestionauto",
    description: "Gestion de votre agence de location de voitures",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#fbf6ec",
    theme_color: "#1f4d3a",
    lang: "ar",
    dir: "rtl",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
