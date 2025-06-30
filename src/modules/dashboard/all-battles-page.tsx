import AllBattles from "./tabs/all-battles";
import Header from "./header";
import { useGlobalStore } from "../../shared/interface/gloabL_var";

export default function AllBattlesPage() {
  const { user } = useGlobalStore();

  return (
    <div className="min-h-screen bg-background bg-gaming-pattern">
      <Header user={user} />
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 max-w-7xl">
        <AllBattles />
      </main>
    </div>
  );
} 