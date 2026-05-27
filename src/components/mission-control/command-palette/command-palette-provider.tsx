"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Command } from "cmdk";
import {
  Folder,
  LayoutGrid,
  Package,
  Plus,
  Receipt,
  Search,
  Settings,
  Upload,
  UserPlus,
} from "lucide-react";

import { useAuth } from "@/components/providers/auth-provider";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useMissionControlData } from "@/hooks/use-mission-control-data";
import { useSpecificCategoriesRealtime } from "@/hooks/use-specific-categories-realtime";
import { can } from "@/lib/auth/permissions";
import { normalizeCompanyId } from "@/lib/company-id";
import { createSpecificCategoryRepository } from "@/infrastructure/firestore/specific-category-repository";

const specificCategoryRepository = createSpecificCategoryRepository();

type CommandPaletteProviderProps = {
  children: ReactNode;
};

export function CommandPaletteProvider({ children }: CommandPaletteProviderProps) {
  const router = useRouter();
  const { profile } = useAuth();
  const companyId = normalizeCompanyId(profile?.companyId);
  const uid = profile?.id ?? "";
  const [open, setOpen] = useState(false);

  const data = useMissionControlData({ profile, uid, companyId });
  const categories = useSpecificCategoriesRealtime(specificCategoryRepository, companyId, Boolean(companyId));

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((current) => !current);
      }
    }
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, []);

  const navigate = useCallback(
    (href: string) => {
      setOpen(false);
      router.push(href);
    },
    [router],
  );

  const motorHits = useMemo(() => {
    return data.motors.slice(0, 20).map((motor) => ({
      id: motor.id,
      label: `${motor.serialCode || "—"} · ${motor.brandName ?? ""} ${motor.engineCode ?? ""}`.trim(),
      href: "/motors",
    }));
  }, [data.motors]);

  const employeeHits = useMemo(() => {
    return data.employees.slice(0, 20).map((employee) => ({
      id: employee.uid,
      label: `${employee.fullName || employee.email} · ${employee.role}`,
      href: "/settings?section=employees",
    }));
  }, [data.employees]);

  const operationHits = useMemo(() => {
    return data.operations.slice(0, 20).map((op) => ({
      id: op.id,
      label: `${op.category || op.type} · ${op.amount.toLocaleString("ru-RU")} ₸`,
      href: "/accounting",
    }));
  }, [data.operations]);

  return (
    <>
      {children}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="overflow-hidden p-0 sm:max-w-xl">
          <Command className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:text-muted-foreground">
            <div className="flex items-center border-b px-3">
              <Search className="mr-2 size-4 shrink-0 opacity-50" />
              <Command.Input
                placeholder="Поиск моторов, операций, разделов…"
                className="flex h-12 w-full bg-transparent py-3 text-sm outline-none"
              />
            </div>
            <Command.List className="max-h-80 overflow-auto p-2">
              <Command.Empty className="py-6 text-center text-sm text-muted-foreground">
                Ничего не найдено
              </Command.Empty>

              <Command.Group heading="Навигация">
                <CommandItem icon={LayoutGrid} onSelect={() => navigate("/")}>
                  Mission Control
                </CommandItem>
                <CommandItem icon={LayoutGrid} onSelect={() => navigate("/motors")}>
                  Все моторы
                </CommandItem>
                <CommandItem icon={Receipt} onSelect={() => navigate("/sold")}>
                  Проданные
                </CommandItem>
                <CommandItem icon={Folder} onSelect={() => navigate("/accounting")}>
                  Бухгалтерия
                </CommandItem>
                <CommandItem icon={Package} onSelect={() => navigate("/warehouse")}>
                  Склад
                </CommandItem>
                <CommandItem icon={Settings} onSelect={() => navigate("/settings")}>
                  Настройки
                </CommandItem>
              </Command.Group>

              {categories.length > 0 ? (
                <Command.Group heading="Специфичные">
                  {categories.map((category) => (
                    <CommandItem
                      key={category.id}
                      icon={Folder}
                      onSelect={() => navigate(`/specific/${category.id}`)}
                    >
                      {category.name}
                    </CommandItem>
                  ))}
                </Command.Group>
              ) : null}

              {can(profile, "inventory_edit") ? (
                <Command.Group heading="Действия">
                  <CommandItem icon={Plus} onSelect={() => navigate("/motors")}>
                    Добавить мотор
                  </CommandItem>
                  <CommandItem icon={Upload} onSelect={() => navigate("/motors")}>
                    Импорт Excel
                  </CommandItem>
                </Command.Group>
              ) : null}

              {can(profile, "accounting_edit") ? (
                <Command.Group heading="Бухгалтерия">
                  <CommandItem icon={Plus} onSelect={() => navigate("/accounting?action=expense")}>
                    Добавить расход
                  </CommandItem>
                </Command.Group>
              ) : null}

              {can(profile, "employee_manage") ? (
                <Command.Group heading="Команда">
                  <CommandItem icon={UserPlus} onSelect={() => navigate("/settings?section=employees")}>
                    Пригласить сотрудника
                  </CommandItem>
                </Command.Group>
              ) : null}

              {motorHits.length > 0 ? (
                <Command.Group heading="Моторы">
                  {motorHits.map((item) => (
                    <CommandItem key={item.id} icon={LayoutGrid} onSelect={() => navigate(item.href)}>
                      {item.label}
                    </CommandItem>
                  ))}
                </Command.Group>
              ) : null}

              {operationHits.length > 0 ? (
                <Command.Group heading="Операции">
                  {operationHits.map((item) => (
                    <CommandItem key={item.id} icon={Folder} onSelect={() => navigate(item.href)}>
                      {item.label}
                    </CommandItem>
                  ))}
                </Command.Group>
              ) : null}

              {employeeHits.length > 0 ? (
                <Command.Group heading="Сотрудники">
                  {employeeHits.map((item) => (
                    <CommandItem key={item.id} icon={UserPlus} onSelect={() => navigate(item.href)}>
                      {item.label}
                    </CommandItem>
                  ))}
                </Command.Group>
              ) : null}
            </Command.List>
          </Command>
        </DialogContent>
      </Dialog>
    </>
  );
}

function CommandItem({
  children,
  onSelect,
  icon: Icon,
}: {
  children: React.ReactNode;
  onSelect: () => void;
  icon: typeof Search;
}) {
  return (
    <Command.Item
      onSelect={onSelect}
      className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm aria-selected:bg-muted"
    >
      <Icon className="size-4 opacity-60" />
      {children}
    </Command.Item>
  );
}
