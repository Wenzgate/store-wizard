import LogoutButton from "./LogoutButton";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-5xl p-6">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold">Admin</h1>
        <LogoutButton />
      </header>
      {children}
    </div>
  );
}
