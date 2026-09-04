import { AdminPortal } from "@/components/admin-portal";
import { adminDashboard } from "@/data/admin-dashboard";

export default function AdminDocumentsPage() {
  return <AdminPortal data={adminDashboard} view="documentos" />;
}
