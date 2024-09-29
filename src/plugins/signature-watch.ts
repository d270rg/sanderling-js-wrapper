import { setIntervalAsync } from "set-interval-async";
import { getMemoryReadResult } from "@read-interface/index";
import { DefaultPlugin } from "./default-plugin";

interface ISigResult {
  [systemName: string]: {
    jumps: number;
    sigs: number;
  };
}

export class SignatureWatch implements DefaultPlugin {
  private getSystemName(fullName: string): string {
    return fullName.split(" <color=")[0];
  }
  private getJumps(text: string): number {
    return Number.parseInt(text.split(" jumps")[0]);
  }
  private getSignaturesAmount(text: string): number {
    return Number.parseInt(text.split(" Signatures in system")[0]);
  }

  private compareResults(prev: ISigResult, curr: ISigResult): void {
    for (let [key, value] of Object.entries(curr)) {
      if (prev[key] !== undefined && prev[key].sigs < value.sigs) {
        console.log(`[${new Date().toUTCString()}] +++ Sig spawned in ${key}`);
      }
      if (prev[key] !== undefined && prev[key].sigs > value.sigs) {
        console.log(
          `[${new Date().toUTCString()}] --- Sig despawned in ${key}`
        );
      }
    }
  }

  public getDescription(): string {
    return "Reads signatures from open Agency window and tracks their changes"
  }

  public async execute(): Promise<void> {
    console.log("Scan active!");
    let previousResult: ISigResult = {};
    setIntervalAsync(async () => {
      const windowText = await getMemoryReadResult(true);
      const start =
        windowText.findIndex((text) => text === "Showing 30 results") + 1;
      const end = windowText.findIndex(
        (text) => text === "Signatures in system"
      );

      if (start < 0 || end < 0) {
        console.log(
          "Agency window is closed, please keep agency window open"
        );
      }

      let result: ISigResult = {};
      const sigList = windowText.slice(start, end);

      // Counter is used instead of String.find for perfomance purposes as we are parsing text with known pattern
      for (let index = 0; index < sigList.length; index++) {
        if (index === 0 || index % 3 === 0) {
          result[this.getSystemName(sigList[index])] = {
            jumps: this.getJumps(sigList[index + 1]),
            sigs: this.getSignaturesAmount(sigList[index + 2]),
          };
        }
      }
      this.compareResults(previousResult, result);
      previousResult = result;
    }, 10000);
  }
}
