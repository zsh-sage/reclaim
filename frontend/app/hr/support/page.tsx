import { LifeBuoy } from "lucide-react";
import MvpFeatureRestricted from "../hr_components/MvpFeatureRestricted";

export default function SupportPage() {
  return (
    <MvpFeatureRestricted
      icon={LifeBuoy}
      title="Support is temporarily restricted"
      description="For MVP production, the support center has been simplified while submission and review workflows remain the priority."
      backHref="hr/dashboard"
      backLabel="Back to Dashboard"
    />
  );
}
