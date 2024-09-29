export abstract class DefaultPlugin {
  public abstract execute(...args: any[]): Promise<void>;
  public abstract getDescription(...args: any[]): string;
}
