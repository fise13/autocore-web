import Link from "next/link";
import { Compass, House } from "lucide-react";
import { userCopy } from "@/lib/user-copy";

import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { marketingRoutes } from "@/lib/marketing-routes";

export function NotFoundPage() {
  return (
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden">
      <Empty>
        <EmptyHeader>
          <EmptyTitle className="mask-b-from-20% mask-b-to-80% text-9xl font-extrabold">
            404
          </EmptyTitle>
          <EmptyDescription className="-mt-8 text-balance text-foreground/80">
            {userCopy.notFound.description}
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <div className="flex gap-2">
            <Button render={<Link href="/" />} nativeButton={false}>
              <House data-icon="inline-start" />
              {userCopy.notFound.home}
            </Button>
            <Button
              variant="outline"
              render={<Link href={marketingRoutes.modules} />}
              nativeButton={false}
            >
              <Compass data-icon="inline-start" />
              {userCopy.notFound.modules}
            </Button>
          </div>
        </EmptyContent>
      </Empty>
    </div>
  );
}
