import AllBattles from "./tabs/all-battles";
import Header from "./header";
import { useGlobalStore } from "../../shared/interface/gloabL_var";

export default function AllBattlesPage() {
  const { user } = useGlobalStore();

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      {/* Header */}
      <Header user={user} />

      <main className="container mx-auto px-4 py-8 max-w-7xl">
        <AllBattles />
      </main>
    </div>
  );
} 