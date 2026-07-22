"use client";

import { useRouter } from "next/navigation";
import { ReactNode, useCallback, useEffect, useState } from "react";

import {
  GridContextMenu,
  GridContextMenuItem,
  GridContextMenuSeparator,
} from "@/components/grid/grid-context-menu";
import {
  resolveAppContextMenuActions,
  type AppContextMenuAction,
} from "@/lib/context-menu/resolve-app-context-menu-actions";

type MenuState = {
  x: number;
  y: number;
  actions: AppContextMenuAction[];
};

type AppContextMenuProviderProps = {
  children: ReactNode;
};

/**
 * Suppresses the browser context menu app-wide and shows a custom menu
 * unless the target is inside `[data-context-menu-scope="local"]` (excel grids, etc.).
 */
export function AppContextMenuProvider({ children }: AppContextMenuProviderProps) {
  const router = useRouter();
  const [menu, setMenu] = useState<MenuState | null>(null);

  const closeMenu = useCallback(() => setMenu(null), []);

  const navigate = useCallback(
    (href: string) => {
      router.push(href);
    },
    [router],
  );

  useEffect(() => {
    function onContextMenu(event: MouseEvent) {
      const target = event.target;
      if (!(target instanceof Element)) {
        event.preventDefault();
        return;
      }

      // Never show the native browser menu in the product UI.
      event.preventDefault();

      if (target.closest("[data-context-menu-scope='local']")) return;
      if (target.closest("[data-app-context-menu]")) return;

      const actions = resolveAppContextMenuActions(target, navigate).filter(
        (action) => !action.disabled,
      );
      if (actions.length === 0) return;

      setMenu({
        x: event.clientX,
        y: event.clientY,
        actions,
      });
    }

    document.addEventListener("contextmenu", onContextMenu, true);
    return () => document.removeEventListener("contextmenu", onContextMenu, true);
  }, [navigate]);

  return (
    <>
      {children}
      {menu ? (
        <GridContextMenu x={menu.x} y={menu.y} onClose={closeMenu} className="z-[80]">
          {menu.actions.map((action) => (
            <div key={action.id}>
              {action.separatorBefore ? <GridContextMenuSeparator /> : null}
              <GridContextMenuItem
                icon={action.icon}
                shortcut={action.shortcut}
                destructive={action.destructive}
                disabled={action.disabled}
                onClick={() => {
                  closeMenu();
                  void action.run();
                }}
              >
                {action.label}
              </GridContextMenuItem>
            </div>
          ))}
        </GridContextMenu>
      ) : null}
    </>
  );
}
