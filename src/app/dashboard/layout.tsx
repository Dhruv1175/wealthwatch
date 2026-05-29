import { NotificationProvider } from "@/components/dashboard/NotificationContext";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <NotificationProvider>
      {children}
    </NotificationProvider>
  );
}