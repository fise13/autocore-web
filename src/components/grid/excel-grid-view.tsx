"use client";

import { MotorEntity } from "@/domain/motor";
import { MotorRepository } from "@/infrastructure/firestore/motor-repository";
import { MotorsExcelGrid } from "@/components/motors/motors-excel-grid";

type ExcelGridViewProps = {
  motors: MotorEntity[];
  companyId: string;
  uid: string;
  canEdit: boolean;
  soldOnly?: boolean;
  onSell: (motor: MotorEntity) => void;
  onUnsell: (motor: MotorEntity) => void;
  repository: MotorRepository;
};

export function ExcelGridView(props: ExcelGridViewProps) {
  return <MotorsExcelGrid {...props} />;
}
