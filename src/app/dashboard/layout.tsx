import { NotificationProvider } from "@/components/dashboard/NotificationContext";
import AddTransactionButton from "@/components/dashboard/AddTransactionButton";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <NotificationProvider>
      {children}
      {/* FAB renders on every dashboard sub-page via layout */}
      <AddTransactionButton />
    </NotificationProvider>
  );
}