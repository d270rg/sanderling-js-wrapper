import {
  RunInVolatileProcessCompleteResponse,
  SetupNotCompleteResponse,
  ListGameClientProcessesResponse,
  SearchUIRootAddressCompletedResponse,
  checkForSetupNotCompletedResponse,
  parseRunInVolatileProcessCompleteResponse,
  checkForNotEmptySearchUIRootAddressCompleted,
  UIRootAddressCompletedResponse,
  ReadFromWindowResult,
} from "./interfaces";
import { url } from "./constants";
import { clearIntervalAsync, setIntervalAsync } from "set-interval-async";

// --------------------- AlternateUI API ---------------------------
// First step
async function listGameClientProcessesRequest(): Promise<
  SetupNotCompleteResponse | ListGameClientProcessesResponse | undefined
> {
  try {
    const response = await fetch(url, {
      method: "POST",
      body: JSON.stringify({
        RunInVolatileProcessRequest: [{ ListGameClientProcessesRequest: [] }],
      }),
    });
    if (!response.ok) {
      throw new Error(`Response status: ${response.status}`);
    }

    const data = (await response.json()) as
      | RunInVolatileProcessCompleteResponse<string>
      | SetupNotCompleteResponse;
    if (checkForSetupNotCompletedResponse(data)) {
      return data;
    }
    return parseRunInVolatileProcessCompleteResponse<ListGameClientProcessesResponse>(
      data
    );
  } catch (error) {
    console.error(error);
  }
}

// Second step
async function searchUIRootAddress(
  processId: number
): Promise<
  | SearchUIRootAddressCompletedResponse<UIRootAddressCompletedResponse>
  | undefined
> {
  try {
    const response = await fetch(url, {
      method: "POST",
      body: JSON.stringify({
        RunInVolatileProcessRequest: [{ SearchUIRootAddress: [{ processId }] }],
      }),
    });
    if (!response.ok) {
      throw new Error(`Response status: ${response.status}`);
    }

    const data =
      (await response.json()) as RunInVolatileProcessCompleteResponse<string>;
    return parseRunInVolatileProcessCompleteResponse<
      SearchUIRootAddressCompletedResponse<UIRootAddressCompletedResponse>
    >(data);
  } catch (error) {
    console.error(error);
  }
}

// Last step
async function readFromWindow(
  windowId: string,
  uiRootAddress: string,
  parseText: true
): Promise<string[] | undefined>;
async function readFromWindow(
  windowId: string,
  uiRootAddress: string,
  parseText: false
): Promise<ReadFromWindowResult | undefined>;
async function readFromWindow(
  windowId: string,
  uiRootAddress: string,
  parseText: boolean
): Promise<ReadFromWindowResult | string[] | undefined> {
  try {
    const response = await fetch(url, {
      method: "POST",
      body: JSON.stringify({
        RunInVolatileProcessRequest: [
          {
            ReadFromWindow: [
              {
                windowId,
                uiRootAddress,
                ParseText: parseText ? "True" : "False",
              },
            ],
          },
        ],
      }),
    });
    if (!response.ok) {
      throw new Error(`Response status: ${response.status}`);
    }

    const data =
      (await response.json()) as RunInVolatileProcessCompleteResponse<string>;
    return parseRunInVolatileProcessCompleteResponse<
      ReadFromWindowResult | string[]
    >(data);
  } catch (error) {
    console.error(error);
  }
}

// --------------------- Wait functions ---------------------------
// Iterate first step
async function checkForGameClientProcess(): Promise<
  ListGameClientProcessesResponse | undefined
> {
  return new Promise((resolve, _) => {
    const interval = setIntervalAsync(async () => {
      console.log('Looking for game client process...');
      const result = await listGameClientProcessesRequest();
      if (result && !checkForSetupNotCompletedResponse(result)) {
        console.log('Game client process response received');
        clearIntervalAsync(interval);
        resolve(result);
      }
    }, 1000);
  });
}

async function waitForGameClientProcess(): Promise<ListGameClientProcessesResponse> {
  const p = new Promise<ListGameClientProcessesResponse>((resolve, reject) => {
    let checkIterations = 0;
    const interval = setIntervalAsync(async () => {
      checkIterations++;
      const result = await checkForGameClientProcess();
      if (checkIterations > 100) {
        clearIntervalAsync(interval);
        reject(
          new Error("Waiting for game client for too long, suspending...")
        );
      }
      if (result && result.ListGameClientProcessesResponse !== undefined) {
        if (result.ListGameClientProcessesResponse.length === 0) {
          reject(new Error("No game client found"));
        }
        clearIntervalAsync(interval);
        console.log(
          "Game client process found",
          result.ListGameClientProcessesResponse[0].processId
        );
        resolve(result);
      }
    }, 1000);
  });

  return p;
}

// Iterate second step
async function checkForSearchUIRootAddress(
  processId: number
): Promise<
  | SearchUIRootAddressCompletedResponse<UIRootAddressCompletedResponse>
  | undefined
> {
  const result = await searchUIRootAddress(processId);
  if (!result) {
    throw new Error("searchUIRootAddress request failed");
  }
  if (checkForNotEmptySearchUIRootAddressCompleted(result)) {
    return result;
  }
}
async function waitForUIRootAddress(processId: number): Promise<string> {
  const p = new Promise<string>((resolve, reject) => {
    let checkIterations = 0;
    const interval = setIntervalAsync(async () => {
      checkIterations++;
      const result = await checkForSearchUIRootAddress(processId);
      if (checkIterations > 100) {
        clearIntervalAsync(interval);
        reject(
          new Error("Waiting for UI root address too long, suspending...")
        );
      }
      if (result !== undefined) {
        const uiRootAddress =
          result.SearchUIRootAddressResponse.stage.SearchUIRootAddressCompleted
            .uiRootAddress;
        console.log("Found UI Root adress", uiRootAddress);
        clearIntervalAsync(interval);
        resolve(uiRootAddress);
      }
    }, 1000);
  });

  return p;
}

// --------------------- Workload ---------------------------
export * from "./interfaces";
export interface ClientConnectionInfo {
  processData: ListGameClientProcessesResponse;
  uiRootAddress: string;
}

export async function connectToClient(): Promise<ClientConnectionInfo> {
  const processData = await waitForGameClientProcess();

  const uiRootAddress = await waitForUIRootAddress(
    processData.ListGameClientProcessesResponse[0].processId
  );
  return { processData, uiRootAddress };
}

export async function getMemoryReadResult(
  gameClientData: ClientConnectionInfo,
  parseText: false
): Promise<ReadFromWindowResult>;
export async function getMemoryReadResult(
  gameClientData: ClientConnectionInfo,
  parseText: true
): Promise<string[]>;
export async function getMemoryReadResult(
  gameClientData: ClientConnectionInfo,
  parseText: boolean
): Promise<string[] | ReadFromWindowResult> {
  return readFromWindow(
    gameClientData.processData.ListGameClientProcessesResponse[0].mainWindowId,
    gameClientData.uiRootAddress,
    parseText as unknown as any //handled by overload
  );
}
