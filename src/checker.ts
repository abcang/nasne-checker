import { IncomingWebhook } from "@slack/webhook";
import Nasne, { ReservedItem } from "./nasne";
import dayjs from "dayjs";

const InsufficientPercent = 90;

export default class Checker {
  nasne: Nasne;
  slack: IncomingWebhook;

  constructor(nasne: Nasne, slack: IncomingWebhook) {
    this.nasne = nasne;
    this.slack = slack;
  }

  async checkAndPostSlack() {
    const blocks = [
      ...(await this.checkHddAndMakeSlackBlocks()),
      ...(await this.checkReservedListAndMakeSlackBlocks()),
    ];

    if (blocks.length > 0) {
      await this.slack.send({
        blocks,
      });
    }
  }

  private async checkHddAndMakeSlackBlocks() {
    try {
      const hddDetails = await this.getHddDetail();
      const hddFormattedDetails = hddDetails.map((hdd) => {
        const usedPercent = Math.round(
          (hdd.usedVolumeSize / hdd.totalVolumeSize) * 100,
        );

        return {
          type: hdd.internalFlag === 0 ? "Internal" : "External",
          usedPercent,
          usedVolumeSizeGB: Math.round(hdd.usedVolumeSize / 1024 / 1024 / 1024),
          totalVolumeSizeGB: Math.round(
            hdd.totalVolumeSize / 1024 / 1024 / 1024,
          ),
        };
      });

      if (
        hddFormattedDetails.some(
          (detail) => detail.usedPercent > InsufficientPercent,
        )
      ) {
        return [
          {
            type: "rich_text",
            elements: [
              {
                type: "rich_text_section",
                elements: [
                  { type: "emoji", name: "floppy_disk" },
                  { type: "text", text: " Insufficient HDD capacity.\n" },
                ],
              },
              {
                type: "rich_text_list",
                style: "bullet",
                elements: hddFormattedDetails.map((detail) => {
                  return {
                    type: "rich_text_section",
                    elements: [
                      { type: "text", text: `${detail.type}: ` },
                      {
                        type: "text",
                        text: `Used ${detail.usedPercent}% (${detail.usedVolumeSizeGB}GB / ${detail.totalVolumeSizeGB}GB)`,
                      },
                    ],
                  };
                }),
              },
            ],
          },
        ];
      }

      return [];
    } catch (err) {
      console.log(err);
      console.error("Failed to get HDD information.");

      return makeSlackBlocksForError("Failed to get HDD information.");
    }
  }

  private async checkReservedListAndMakeSlackBlocks() {
    try {
      const blocks = [];
      const reservedList = await this.nasne.getReservedList();
      const itemList = reservedList.item.sort(
        (a, b) => dayjs(a.startDateTime).unix() - dayjs(b.startDateTime).unix(),
      );

      const overlapErrorReservations = itemList.filter(
        (item) => item.conflictId > 0,
      );
      if (overlapErrorReservations.length) {
        blocks.push(
          {
            type: "section",
            text: {
              type: "plain_text",
              text: ":warning: Reservations are overlap.",
              emoji: true,
            },
          },
          ...overlapErrorReservations.map(makeSlackBlockForReservation),
        );
      }

      const notExistErrorReservations = itemList.filter(
        (item) => item.eventId === 65536,
      );
      if (notExistErrorReservations.length) {
        blocks.push(
          {
            type: "section",
            text: {
              type: "plain_text",
              text: ":no_entry: Reservations does not exist.",
              emoji: true,
            },
          },
          ...overlapErrorReservations.map(makeSlackBlockForReservation),
        );
      }

      return blocks;
    } catch (err) {
      console.log(err);
      console.error("Failed to get reservation information.");

      return makeSlackBlocksForError("Failed to get reservation information.");
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

function makeSlackBlockForReservation(item: ReservedItem) {
  const startTime = dayjs(item.startDateTime).format("YYYY/MM/DD(ddd) HH:mm");
  const endTime = dayjs(item.startDateTime)
    .add(item.duration, "s")
    .format("HH:mm");

  return {
    type: "rich_text",
    elements: [
      {
        type: "rich_text_section",
        elements: [
          {
            type: "text",
            text: convertEnclose(item.title) + "\n",
            style: {
              bold: true,
            },
          },
          {
            type: "text",
            text: `${startTime} - ${endTime} | ${item.channelName}`,
          },
        ],
      },
    ],
  };
}

function makeSlackBlocksForError(text: string) {
  return [
    {
      type: "rich_text",
      elements: [
        {
          type: "rich_text_section",
          elements: [
            { type: "emoji", name: "bangbang" },
            { type: "text", text: ` ${text}\n` },
          ],
        },
      ],
    },
  ];
}
