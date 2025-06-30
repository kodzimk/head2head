import { useGlobalStore } from "../../shared/interface/gloabL_var"
import Header from "../dashboard/header"

export default function SelectionPage() {
  const { user } = useGlobalStore()

  return (
    <div className="min-h-screen bg-background bg-gaming-pattern">
      <Header user={user} />
      <main className="container mx-auto px-4 py-8">
        <div className="flex flex-col items-center justify-center min-h-[80vh]">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">Selection</h1>
          <p className="text-xl text-orange-500">Coming Soon</p>
        </div>
      </main>
    </div>
  )
} 