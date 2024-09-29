export interface SetupNotCompleteResponse {
  SetupNotCompleteReponse: string[];
}

export interface RunInVolatileProcessCompleteResponse<T> {
  RunInVolatileProcessCompleteResponse: {
    durationInMilliseconds: number;
    exceptionToString: {
      Nothing: string[];
    };
    returnValueToString: {
      Just: T[]; // Parses to `ListGameClientProcessesResponse`,`SearchUIRootAddressResponse` or `ReadFromWindowResult`
    };
  }[];
}

export interface ListGameClientProcessesResponse {
  ListGameClientProcessesResponse: {
    processId: number;
    mainWindowId: string;
    mainWindowTitle: string;
    mainWindowZIndex: number;
  }[];
}

export interface SearchUIRootAddressInProgressResponse {
  SearchUIRootAddressResponse: {
    processId: number;
    stage: {
      SearchUIRootAddressInProgress: {
        searchBeginTimeMilliseconds: 0;
        currentTImeMilliseconds: 0;
      };
    };
  };
}

export interface UIRootAddressCompletedResponse {
  uiRootAddress: string;
}

export interface SearchUIRootAddressCompletedResponse<T> {
  SearchUIRootAddressResponse: {
    processId: number;
    stage: {
      SearchUIRootAddressCompleted: T;
    };
  };
}

export interface ReadFromWindowResult {
  Completed: {
    processId: number;
    windowClientRectOffset: { x: number; y: number };
    readingId: string;
    memoryReadingSerialRepresentationJson: string;
  };
}

export function parseRunInVolatileProcessCompleteResponse<T>(
  rawResponse: RunInVolatileProcessCompleteResponse<string>
): T {
  const responseValue =
    rawResponse.RunInVolatileProcessCompleteResponse[0].returnValueToString
      .Just[0];
  return Array.isArray(responseValue)
    ? responseValue
    : JSON.parse(responseValue);
}

export function checkForSetupNotCompletedResponse(
  rawResponse: any | SetupNotCompleteResponse
): rawResponse is SetupNotCompleteResponse {
  if (rawResponse["SetupNotCompleteReponse"] !== undefined) {
    return true;
  }
  return false;
}

export function checkForNotEmptySearchUIRootAddressCompleted(
  response: SearchUIRootAddressCompletedResponse<any>
): response is SearchUIRootAddressCompletedResponse<UIRootAddressCompletedResponse> {
  if (
    response.SearchUIRootAddressResponse.stage?.SearchUIRootAddressCompleted!== undefined && response.SearchUIRootAddressResponse.stage.SearchUIRootAddressCompleted[
      "uiRootAddress"
    ] !== undefined
  ) {
    return true;
  }
  return false;
}
