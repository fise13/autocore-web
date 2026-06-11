import Link from "next/link";
import { CompassIcon, HomeIcon } from "lucide-react";

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
          <EmptyDescription className="-mt-8 text-nowrap text-foreground/80">
            Страница, которую вы ищете, могла быть <br />
            перемещена или не существует.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <div className="flex gap-2">
            <Button render={<Link href="/" />} nativeButton={false}>
              <HomeIcon data-icon="inline-start" />
              На главную
            </Button>
            <Button
              variant="outline"
              render={<Link href={marketingRoutes.modules} />}
              nativeButton={false}
            >
              <CompassIcon data-icon="inline-start" />
              Модули
            </Button>
          </div>
        </EmptyContent>
      </Empty>
    </div>
  );
}
