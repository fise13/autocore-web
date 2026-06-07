declare module "@barba/core" {
  export interface ISchemaPage {
    container: HTMLElement;
    html: string;
    namespace: string;
    url: {
      href?: string;
      path?: string;
      hash?: string;
      query: Record<string, unknown>;
      port: number;
    };
  }

  export interface ITransitionData {
    current: ISchemaPage;
    next: ISchemaPage;
    trigger: string | HTMLElement;
    event?: Event;
  }

  export interface ITransitionPage {
    name?: string;
    custom?: (data: ITransitionData) => boolean;
    namespace?: string | string[];
    leave?: (data: ITransitionData) => Promise<unknown> | unknown;
    enter?: (data: ITransitionData) => Promise<unknown> | unknown;
  }

  export interface IBarbaOptions {
    transitions?: ITransitionPage[];
    prevent?: ((data: { el: HTMLAnchorElement; event: Event; href: string }) => boolean) | null;
    preventRunning?: boolean;
    debug?: boolean;
  }

  export interface BarbaCore {
    init(options?: IBarbaOptions): void;
    hooks: {
      after(callback: () => void): void;
    };
    transitions: {
      get(data: ITransitionData, filters?: { once?: boolean }): ITransitionPage;
      leave(data: ITransitionData, transition: ITransitionPage): Promise<unknown>;
      enter(data: ITransitionData, transition: ITransitionPage, leaveResult?: unknown): Promise<void>;
      isRunning: boolean;
    };
    url: {
      parse(href: string): ISchemaPage["url"];
    };
  }

  const barba: BarbaCore;
  export default barba;
}
