import { setIntervalAsync } from "set-interval-async";
import { connectToClient, getMemoryReadResult } from "@read-interface/index";
import { DefaultPlugin } from "./default-plugin";

const colors = [90,
  31,
  92,
  91,
 36,
   0,
  0,
 31,
  90,
 32,
 90,
  33,
 31,
  32,
 90];
let lastColorIndex = 0;
function getColor() {
  const currentColor = colors[lastColorIndex];;
  lastColorIndex++;
  return currentColor;
}

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
    if (text === undefined) {
      return NaN;
    }
    return Number.parseInt(text.split(" jumps")[0]);
  }
  private getSignaturesAmount(text: string): number {
    if (text === undefined) {
      return NaN;
    }
    return Number.parseInt(text.split(" Signatures in system")[0]);
  }

  private compareResults(prev: ISigResult, curr: ISigResult): void {
    const color = getColor();
    for (let [key, value] of Object.entries(curr)) {
      if (prev[key] !== undefined && prev[key].sigs < value.sigs) {
        console.log(
          `\u001b[1;${color}m [${new Date().toUTCString()}] +++ Sig spawned in ${key} - ${
            value.jumps
          } jumps \u001b[0m`
        );
      }
      if (prev[key] !== undefined && prev[key].sigs > value.sigs) {
        console.log(
          `\u001b[1;${color}m [${new Date().toUTCString()}] --- Sig despawned in ${key} - ${
            value.jumps
          } jumps \u001b[0m`
        );
      }
    }
  }

  public getDescription(): string {
    return "Reads signatures from open Agency window and tracks their changes";
  }

  public async execute(): Promise<void> {
    console.log("Activating scan...");
    const gameClientData = await connectToClient();
    console.log("Received game client data, scan is now active!");
    let previousResult: ISigResult = {};
    setIntervalAsync(async () => {
      const windowText = await getMemoryReadResult(gameClientData, true);
      const start =
        windowText.findIndex((text) => text === "Showing 30 results") + 1;
      const end = windowText.findIndex(
        (text) => text === "Signatures in system"
      );
      if (start < 0 || end < 0) {
        console.log("Agency window is closed, please keep agency window open");
        return;
      }

      let result: ISigResult = {};
      const sigList = windowText.slice(start, end);

      // Counter is used instead of String.find for perfomance purposes as we are parsing text with known pattern
      for (let index = 0; index < sigList.length; index++) {
        if (index === 0 || index % 3 === 0) {
          const systemName = this.getSystemName(sigList[index]);
          const jumps = this.getJumps(sigList[index + 1]);
          const sigs = this.getSignaturesAmount(sigList[index + 2]);
          if (Number.isNaN(jumps) || Number.isNaN(sigs)) {
            continue;
          }
          result[systemName] = {
            jumps,
            sigs,
          };
        }
      }
      this.compareResults(previousResult, result);
      previousResult = result;
    }, 10000);
  }
}
