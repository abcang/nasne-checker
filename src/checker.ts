import { IncomingWebhook } from "@slack/webhook";
import { MessageAttachment } from "@slack/types";
import Nasne, { ReservedItem } from "./nasne";
import dayjs from "dayjs";

export default class Checker {
  nasne: Nasne;
  slack: IncomingWebhook;

  constructor(nasne: Nasne, slack: IncomingWebhook) {
    this.nasne = nasne;
    this.slack = slack;
  }

  async checkHddAndPostSlack() {
    try {
      const hddDetails = await this.getHddDetail();
      for (const hdd of hddDetails) {
        const percent = Math.round(
          (hdd.usedVolumeSize / hdd.totalVolumeSize) * 100,
        );
        if (percent > 90) {
          const type = hdd.internalFlag ? "External" : "Internal";
          await postWarning(
            this.slack,
            `:floppy_disk: The capacity of the ${type} HDD is insufficient (${percent}% used).`,
          );
        }
      }
    } catch (err) {
      console.log(err);
      console.error("Failed to get information.");
    }
  }

  async checkReservedListAndPostSlack() {
    try {
      const reservedList = await this.nasne.getReservedList();
      const itemList = reservedList.item.sort(
        (a, b) => dayjs(a.startDateTime).unix() - dayjs(b.startDateTime).unix(),
      );

      const overlapErrorFields = itemList
        .filter((item) => item.conflictId > 0)
        .map(convertField);
      if (overlapErrorFields.length) {
        await postWarning(this.slack, ":warning: Reservations are overlap.", {
          color: "warning",
          fields: overlapErrorFields,
        });
      }

      const notExistErrorFields = itemList
        .filter((item) => item.eventId === 65536)
        .map(convertField);
      if (notExistErrorFields.length) {
        await postWarning(
          this.slack,
          ":exclamation: Reservations does not exist.",
          {
            color: "danger",
            fields: notExistErrorFields,
          },
        );
      }
    } catch (err) {
      console.log(err);
      console.error("Failed to get information.");
    }
  }

  private async getHddDetail() {
    const data = await this.nasne.getHddList();

    const hdd = data.HDD.filter((info) => info.registerFlag === 1);
    const infoList = await Promise.all(
      hdd.map((info) => this.nasne.getHddInfo(info.id)),
    );

    return infoList.map((detail) => detail.HDD);
  }
}

function convertEnclose(text: string) {
  const enclose = [
    ["\ue0fd", "[手]"],
    ["\ue0fe", "[字]"],
    ["\ue0ff", "[双]"],
    ["\ue180", "[デ]"],
    ["\ue182", "[二]"],
    ["\ue183", "[多]"],
    ["\ue184", "[解]"],
    ["\ue185", "[SS]"],
    ["\ue18c", "[映]"],
    ["\ue18d", "[無]"],
    ["\ue190", "[前]"],
    ["\ue191", "[後]"],
    ["\ue192", "[再]"],
    ["\ue193", "[新]"],
    ["\ue194", "[初]"],
    ["\ue195", "[終]"],
    ["\ue196", "[生]"],
    ["\ue19c", "[他]"],
  ];

  return enclose.reduce((converted, [before, after]) => {
    return converted.replace(before, after);
  }, text);
}

function convertField(item: ReservedItem) {
  const startTime = dayjs(item.startDateTime).format("YYYY/MM/DD(ddd) HH:mm");
  const endTime = dayjs(item.startDateTime)
    .add(item.duration, "s")
    .format("HH:mm");
  return {
    title: convertEnclose(item.title),
    value: `${startTime} - ${endTime}`,
    short: false,
  };
}

async function postWarning(
  slack: IncomingWebhook,
  text: string,
  attachment: MessageAttachment | null = null,
) {
  return slack.send({
    text,
    ...(attachment ? { attachments: [attachment] } : {}),
  });
}
