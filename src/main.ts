#!/usr/bin/env node

import { Command } from "commander";
import { IncomingWebhook } from "@slack/webhook";
import schedule from "node-schedule";
import Nasne from "./nasne";
import Checker from "./checker";
import { version } from "../package.json";

const program = new Command();

program.on("--help", () => {
  console.log("  Examples:");
  console.log("");
  console.log("    $ nasne-checker \\");
  console.log('      --nasne "192.168.10.10 192.168.10.11" \\');
  console.log(
    "      --slack https://hooks.slack.com/services/XXX/XXX/XXXXX \\",
  );
  console.log('      --cron "00 20 * * 1,3,5"');
});

program
  .version(version)
  .option("--nasne <hosts>", "Nasne hosts (required)")
  .option("--slack <url>", "Slack webhook url (required)")
  .option("--cron <format>", "Cron format (optional)")
  .option(
    "--timezone <timezone>",
    'When using cron option (Default is "Asia/Tokyo")',
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

const slack = new IncomingWebhook(options.slack);
const nasneHostList = options.nasne.split(" ").filter((v) => v);
const nasneList = nasneHostList.map((host) => new Nasne(host));
const checkerList = nasneList.map((nasne) => new Checker(nasne, slack));

async function execute() {
  for (const checker of checkerList) {
    await checker.checkAndPostSlack();
  }
}

if (options.cron) {
  schedule.scheduleJob(
    {
      rule: options.cron,
      tz: options.timezone || "Asia/Tokyo",
    },
    execute,
  );
} else {
  void execute();
}
