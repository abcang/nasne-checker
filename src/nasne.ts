import axios, { AxiosRequestConfig, AxiosResponse } from "axios";

export type ErrorCode = number;
export type HDDID = number;
export type ReservedItemID = string;
export type DatetimeString = string;

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
  id: HDDID;
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
  storageId: HDDID;
  recordingFlag: number;
  priority: DatetimeString;
}

export default class Nasne {
  host: string;

  constructor(host: string) {
    this.host = host;
  }

  async get<Response>(
    port: number,
    path: string,
    query: AxiosRequestConfig | undefined = undefined,
  ): Promise<AxiosResponse<Response>> {
    return axios.get<Response>(`http://${this.host}:${port}${path}`, query);
  }

  async getReservedList(): Promise<ReservedListResponse> {
    const { data } = await this.get<ReservedListResponse>(
      64220,
      "/schedule/reservedListGet",
      {
        params: {
          searchCriteria: 0,
          filter: 0,
          startingIndex: 0,
          requestedCount: 0,
          sortCriteria: 0,
          withDescriptionLong: 0,
          withUserData: 1,
        },
      },
    );

    return data;
  }

  async getHddList(): Promise<HDDListResponse> {
    const { data } = await this.get<HDDListResponse>(
      64210,
      "/status/HDDListGet",
    );

    return data;
  }

  async getHddInfo(id: HDDID): Promise<HddInfoResponse> {
    const { data } = await this.get<HddInfoResponse>(
      64210,
      "/status/HDDInfoGet",
      {
        params: { id },
      },
    );

    return data;
  }

  async getHddDetail(): Promise<HddInfo[]> {
    const data = await this.getHddList();

    const hdd = data.HDD.filter((info) => info.registerFlag === 1);
    const infoList = await Promise.all(
      hdd.map((info) => this.getHddInfo(info.id)),
    );

    return infoList.map((detail) => detail.HDD);
  }
}
