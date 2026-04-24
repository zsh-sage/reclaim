import { History } from "lucide-react";
import MvpFeatureRestricted from "../hr_components/MvpFeatureRestricted";

export default function SettingsPage() {
  return (
    <MvpFeatureRestricted
      icon={History}
      title="History is temporarily restricted"
      description="For MVP production, history feature has been simplified while core reimbursement flows are prioritized."
      backHref="/hr/dashboard"
      backLabel="Back to Dashboard"
    />
  );
}
