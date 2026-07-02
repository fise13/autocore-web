export type DeskConnectionPlatform = "kolesa" | "olx" | "instagram";

export type DeskConnectionRecord = {
  id: string;
  pluginId: string;
  platform: DeskConnectionPlatform;
  label: string;
  storeName?: string;
  accentColor?: string;
  createdAt: string;
  updatedAt: string;
};

export type DeskConnectionsSnapshot = {
  connections: DeskConnectionRecord[];
  activeConnectionId: string | null;
};
