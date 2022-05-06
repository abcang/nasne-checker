#!/usr/bin/env node

import { Command } from "commander";
import { IncomingWebhook } from "@slack/webhook";
import dayjs from "dayjs";
import cron from "node-cron";
import Nasne, { ReservedItem } from "./nasne";
import { version } from "../package.json";
import { MessageAttachment } from "@slack/types";

const program = new Command();

program.on("--help", () => {
  console.log("  Examples:");
  console.log("");
  console.log("    $ nasne-checker \\");
  console.log("      --nasne 192.168.10.10 \\");
  console.log(
    "      --slack https://hooks.slack.com/services/XXX/XXX/XXXXX \\"
  );
  console.log('      --cron "00 20 * * 1,3,5"');
});

program
  .version(version)
  .option("--nasne <host>", "Nasne host (required)")
  .option("--slack <url>", "Slack webhook url (required)")
  .option("--cron <format>", "Cron format (optional)")
  .option(
    "--timezone <timezone>",
    'When using cron option (Default is "Asia/Tokyo")'
  )
  .parse(process.argv);

interface Options {
  nasne?: string;
  slack?: string;
  cron?: string;
  timezone?: string;
}

const options = program.opts<Options>();

if (!options.nasne || !options.slack) {
  console.log('"--nasne" option and "--slack" option are required.');
  program.outputHelp();
  process.exit(-1);
}

const nasne = new Nasne(options.nasne);
const slack = new IncomingWebhook(options.slack);

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
  text: string,
  attachment: MessageAttachment | null = null
) {
  return slack.send({
    text,
    ...(attachment ? { attachments: [attachment] } : {}),
  });
}

async function execute() {
  try {
    const hddDetails = await nasne.getHddDetail();
    for (const hdd of hddDetails) {
      const parcent = Math.round(
        (hdd.usedVolumeSize / hdd.totalVolumeSize) * 100
      );
      if (parcent > 90) {
        const type = hdd.internalFlag ? "External" : "Internal";
        await postWarning(
          `:floppy_disk: The capacity of the ${type} HDD is insufficient (${parcent}% used).`
        );
      }
    }
  } catch (err) {
    console.log(err);
    console.error("Failed to get information.");
  }

  try {
    const reservedList = await nasne.getReservedList();
    const itemList = reservedList.item.sort(
      (a, b) => dayjs(a.startDateTime).unix() - dayjs(b.startDateTime).unix()
    );

    const overlapErrorFields = itemList
      .filter((item) => item.conflictId > 0)
      .map(convertField);
    if (overlapErrorFields.length) {
      await postWarning(":warning: Reservations are overlap.", {
        color: "warning",
        fields: overlapErrorFields,
      });
    }

    const notExistErrorFields = itemList
      .filter((item) => item.eventId === 65536)
      .map(convertField);
    if (notExistErrorFields.length) {
      await postWarning(":exclamation: Reservations does not exist.", {
        color: "danger",
        fields: notExistErrorFields,
      });
    }
  } catch (err) {
    console.log(err);
    console.error("Failed to get information.");
  }
}

if (options.cron) {
  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  cron.schedule(options.cron, execute),
    { timezone: options.timezone || "Asia/Tokyo" };
} else {
  void execute();
}
