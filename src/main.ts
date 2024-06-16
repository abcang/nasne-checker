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
  console.log("      --nasne 192.168.10.10 \\");
  console.log(
    "      --slack https://hooks.slack.com/services/XXX/XXX/XXXXX \\",
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

const nasne = new Nasne(options.nasne);
const slack = new IncomingWebhook(options.slack);
const checker = new Checker(nasne, slack);

async function execute() {
  await checker.checkHddAndPostSlack();
  await checker.checkReservedListAndPostSlack();
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
