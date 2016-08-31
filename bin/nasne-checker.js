#!/usr/bin/env node

const program = require('commander');
const slackInitializer = require('slack-notify');
const moment = require('moment');
const Nasne = require('../lib/nasne');


program.on('--help', () => {
  console.log('  Examples:');
  console.log('');
  console.log('    $ nasne-checker --nasne 192.168.10.10 \\');
  console.log('      --slack https://hooks.slack.com/services/XXX/XXX/XXXXX \\');
  console.log('      --interval 24');
});

program
  .version('1.1.3')
  .option('--nasne <host>', 'Nasne host (required)')
  .option('--slack <url>', 'Slack webhook url (required)')
  .option('--interval <hour>', 'Execution interval (optional)', Number)
  .parse(process.argv);


if (!program.nasne || !program.slack) {
  console.log('"--nasne" option and "--slack" option are required.');
  program.outputHelp();
  process.exit(-1);
}

const nasne = new Nasne(program.nasne);
const slack = slackInitializer(program.slack);

function convertField(item) {
  const startTime = moment(item.startDateTime).format('YYYY/MM/DD(ddd) HH:mm');
  const endTime = moment(item.startDateTime).add(item.duration, 's').format('HH:mm');
  return {
    title: item.title,
    value: `${startTime} - ${endTime}`,
    short: false
  };
}

function postWarning(text, attachment = null) {
  slack.request({
    text,
    attachments: [attachment]
  });
}

function execute() {
  nasne.getHddDetail().then((data) => {
    for (const hdd of data) {
      const parcent = Math.round((hdd.usedVolumeSize / hdd.totalVolumeSize) * 100);
      if (parcent > 90) {
        const type = hdd.internalFlag ? 'External' : 'Internal';
        postWarning(`:floppy_disk: The capacity of the ${type} HDD is insufficient (${parcent}% used).`);
      }
    }
  }, (data) => {
    console.log(data);
    console.error('Failed to get information.');
  });

  nasne.getReservedList().then((data) => {
    const itemList = data.item.sort((a, b) => (
      moment(a.startDateTime) - moment(b.startDateTime))
    );

    const overlapErrorFields = itemList.filter((item) => item.conflictId > 0).map(convertField);
    if (overlapErrorFields) {
      postWarning(':warning: Reservations are overlap.', {
        color: 'warning',
        fields: overlapErrorFields
      });
    }

    const notExistErrorFields = itemList.filter((item) => item.eventId === 65536).map(convertField);
    if (notExistErrorFields) {
      postWarning(':exclamation: Reservations does not exist.', {
        color: 'danger',
        fields: notExistErrorFields
      });
    }
  }, () => {
    console.error('Failed to get information.');
  });
}

execute();
if (program.interval > 0) {
  setInterval(execute, program.interval * 3600 * 1000);
}
