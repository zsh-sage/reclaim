import { Settings } from "lucide-react";
import MvpFeatureRestricted from "../_components/MvpFeatureRestricted";

export default function SettingsPage() {
  return (
    <MvpFeatureRestricted
      icon={Settings}
      title="Settings is temporarily restricted"
      description="For MVP production, account settings has been simplified while core reimbursement flows are prioritized."
      backHref="/employee/dashboard"
      backLabel="Back to Dashboard"
    />
  );
}
