import { AdminPortal } from "@/components/admin-portal";
import { adminDashboard } from "@/data/admin-dashboard";

export default function SystemsPage() {
  return <AdminPortal data={adminDashboard} view="sistemas" />;
}
