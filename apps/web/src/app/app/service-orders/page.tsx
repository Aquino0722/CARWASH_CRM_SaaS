export default function ServiceOrdersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Service Orders
        </h1>
        <p className="text-sm text-muted-foreground">
          Manage service orders from creation to delivery
        </p>
      </div>
      <div className="flex items-center justify-center h-48 rounded-lg border border-dashed text-sm text-muted-foreground">
        Service orders coming soon
      </div>
    </div>
  );
}
