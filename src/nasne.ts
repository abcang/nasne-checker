import axios, { AxiosRequestConfig } from "axios";

type Brand<K, T> = K & { __brand: T };

export type ErrorCode = Brand<number, "ErrorCode">;
export type HddID = Brand<number, "HddID">;
export type ReservedItemID = Brand<string, "ReservedItemID">;
export type DatetimeString = Brand<string, "DatetimeString">;

interface BaseResponse {
  errorcode: ErrorCode;
}

interface NameResponse {
  errorcode: ErrorCode;
  name: string;
}

interface HDDListResponse {
  errorcode: ErrorCode;
  number: number;
  HDD: Pick<HddInfo, "id" | "internalFlag" | "mountStatus" | "registerFlag">[];
}

interface HddInfoResponse {
  errorcode: ErrorCode;
  HDD: HddInfo;
}

export interface HddInfo {
  id: HddID;
  internalFlag: 0 | 1;
  mountStatus: 0 | 1;
  registerFlag: 0 | 1;
  format: string;
  name: string;
  vendorID: string;
  productID: string;
  serialNumber: string;
  usedVolumeSize: number;
  freeVolumeSize: number;
  totalVolumeSize: number;
}

interface ReservedListResponse {
  errorcode: ErrorCode;
  item: ReservedItem[];
}

export interface ReservedItem {
  id: ReservedItemID;
  title: string;
  description: string;
  startDateTime: DatetimeString;
  duration: number;
  conditionId: string;
  quality: number;
  channelName: string;
  channelNumber: number;
  broadcastingType: number;
  serviceId: number;
  eventId: number;
  genre: { id: number; type: number }[];
  audioInfo: { componentTag: number; componentType: number }[];
  captionInfo: number;
  componentType: number;
  conflictId: number;
  mediaRemainAlertId: number;
  creatorId: number;
  storageId: HddID;
  recordingFlag: number;
  priority: DatetimeString;
}

export default class Nasne {
  host: string;

  constructor(host: string) {
    this.host = host;
  }

  private async get<Response extends BaseResponse>(
    port: number,
    path: string,
    query: AxiosRequestConfig | undefined = undefined,
  ): Promise<Response> {
    const { data } = await axios.get<Response>(
      `http://${this.host}:${port}${path}`,
      query,
    );

    if (data.errorcode > 0) {
      throw Error(`Request Failed: ${data.errorcode}`);
    }

    return data;
  }

  async getReservedList(): Promise<ReservedListResponse> {
    return this.get<ReservedListResponse>(64220, "/schedule/reservedListGet", {
      params: {
        searchCriteria: 0,
        filter: 0,
        startingIndex: 0,
        requestedCount: 0,
        sortCriteria: 0,
        withDescriptionLong: 0,
        withUserData: 1,
      },
    });
  }

  async getServerName(): Promise<NameResponse> {
    return this.get<NameResponse>(64210, "/status/boxNameGet");
  }

  async getHddList(): Promise<HDDListResponse> {
    return this.get<HDDListResponse>(64210, "/status/HDDListGet");
  }

  async getHddInfo(id: HddID): Promise<HddInfoResponse> {
    return this.get<HddInfoResponse>(64210, "/status/HDDInfoGet", {
      params: { id },
    });
  }
}
