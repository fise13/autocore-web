type NetworkListener = (online: boolean) => void;

export class NetworkMonitor {
  private online = typeof navigator === "undefined" ? true : navigator.onLine;
  private listeners = new Set<NetworkListener>();
  private boundOnline = () => this.setOnline(true);
  private boundOffline = () => this.setOnline(false);
  private attached = false;

  start() {
    if (typeof window === "undefined" || this.attached) return;
    window.addEventListener("online", this.boundOnline);
    window.addEventListener("offline", this.boundOffline);
    this.online = navigator.onLine;
    this.attached = true;
  }

  stop() {
    if (typeof window === "undefined" || !this.attached) return;
    window.removeEventListener("online", this.boundOnline);
    window.removeEventListener("offline", this.boundOffline);
    this.attached = false;
  }

  isOnline() {
    return this.online;
  }

  subscribe(listener: NetworkListener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private setOnline(next: boolean) {
    if (this.online === next) return;
    this.online = next;
    for (const listener of this.listeners) listener(next);
  }
}
