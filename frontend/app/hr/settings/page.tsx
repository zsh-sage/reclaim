import { Settings } from "lucide-react";
import MvpFeatureRestricted from "../hr_components/MvpFeatureRestricted";

export default function SettingsPage() {
  return (
    <MvpFeatureRestricted
      icon={Settings}
      title="Settings is temporarily restricted"
      description="For MVP production, account settings has been simplified while core reimbursement flows are prioritized."
      backHref="/hr/dashboard"
      backLabel="Back to Dashboard"
    />
  );
}
