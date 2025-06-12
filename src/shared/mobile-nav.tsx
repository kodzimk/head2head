import { useState } from "react";
import { Menu } from "lucide-react";
import { Button } from "./ui/button";
import { Sheet, SheetContent, SheetTrigger } from "./ui/sheet";
import { useNavigate } from "react-router-dom";
  
export function MobileNav() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" className="p-0 h-10 w-10 md:hidden">
          <Menu className="h-6 w-6" />
          <span className="sr-only">Toggle menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[80%] sm:w-[350px] pr-0">
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between border-b pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-500">
                <p className="font-bold text-white">H2H</p>
              </div>
              <span className="font-bold text-xl text-slate-900">
                Head2Head
              </span>
            </div>
          </div>
          <div className="mt-auto pb-8">
            <Button className="max-w-72 bg-blue-600 hover:bg-blue-700 text-white" onClick={() => navigate('/sign-up')}>
              Start Now!
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
