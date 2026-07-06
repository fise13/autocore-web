export type WorkspaceAccessBlock =
  | {
      kind: 'removed';
      companyId: string;
      companyName: string;
    }
  | {
      kind: 'deactivated';
      companyId: string;
      companyName: string;
    }
  | {
      kind: 'no_company';
    };
