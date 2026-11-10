export interface Resource {
  label: string;
  href?: string;
  detail: string;
}

export const COUNTRIES: Record<string, { name: string; items: Resource[] }> = {
  IN: {
    name: "India",
    items: [
      { label: "Call 1930", href: "tel:1930", detail: "National Cyber Crime Helpline. Call straight away if money has left your account." },
      { label: "cybercrime.gov.in", href: "https://cybercrime.gov.in", detail: "Report online fraud to the national portal." },
      { label: "Sanchar Saathi (Chakshu)", href: "https://sancharsaathi.gov.in/sfc/", detail: "Report suspicious calls, SMS and WhatsApp messages." },
    ],
  },
  US: {
    name: "United States",
    items: [
      { label: "reportfraud.ftc.gov", href: "https://reportfraud.ftc.gov", detail: "Report the scam to the FTC." },
      { label: "Forward scam texts to 7726", detail: "Free. Your carrier uses it to block the sender." },
      { label: "ic3.gov", href: "https://www.ic3.gov", detail: "Report internet crime to the FBI if you lost money." },
    ],
  },
  GB: {
    name: "United Kingdom",
    items: [
      { label: "Forward scam texts to 7726", detail: "Free. Reports the sender to your mobile network." },
      { label: "report@phishing.gov.uk", href: "mailto:report@phishing.gov.uk", detail: "Forward scam emails here." },
      { label: "Action Fraud", href: "https://www.actionfraud.police.uk", detail: "Report fraud if you lost money or gave details." },
    ],
  },
  CA: {
    name: "Canada",
    items: [
      { label: "Canadian Anti-Fraud Centre", href: "https://antifraudcentre-centreantifraude.ca", detail: "Report scams online or call 1-888-495-8501." },
    ],
  },
  AU: {
    name: "Australia",
    items: [
      { label: "Scamwatch", href: "https://www.scamwatch.gov.au/report-a-scam", detail: "Report a scam to the ACCC." },
      { label: "ReportCyber", href: "https://www.cyber.gov.au/report-and-recover/report", detail: "Report cybercrime if you lost money or data." },
    ],
  },
  OTHER: {
    name: "Elsewhere",
    items: [
      { label: "Your bank", detail: "Call the number on the back of your card or on its official website, not one from the message." },
      { label: "Local police or consumer-protection agency", detail: "Report the scam, especially if money was lost." },
    ],
  },
};

export function guessCountry(): string {
  const region = (navigator.language.split("-")[1] ?? "").toUpperCase();
  return region in COUNTRIES ? region : "OTHER";
}
