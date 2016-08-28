#!/usr/bin/env node

const program = require('commander');
const slackInitializer = require('slack-notify');
const moment = require('moment');
const Nasne = require('../lib/nasne-wrapper');


program.on('--help', () => {
  console.log('  Examples:');
  console.log('');
  console.log('    $ nasne-checker --nasne 192.168.10.10 \\');
  console.log('      --slack https://hooks.slack.com/services/XXX/XXX/XXXXX \\');
  console.log('      --interval 24');
});

program
  .version('1.0.0')
  .option('--nasne <host>', 'Nasne host (required)')
  .option('--slack <url>', 'Slack webhook url (required)')
  .option('--interval [hour]', 'Execution interval', 0)
  .parse(process.argv);


if (!program.nasne || !program.slack) {
  console.log('"--nasne" option and "--slack" option are required.');
  program.outputHelp();
  process.exit(-1);
}

const nasne = new Nasne(program.nasne);
const slack = slackInitializer(program.slack);

function execute() {
  nasne.getHDDDetailAsync().then((data) => {
    for (const hdd of data) {
      const parcent = Math.round((hdd.usedVolumeSize / hdd.totalVolumeSize) * 100);
      if (parcent > 90) {
        const type = hdd.internalFlag ? 'External' : 'Internal';
        slack.request({
          text: `:floppy_disk: The capacity of the ${type} HDD is insufficient (${parcent}% used).`,
        });
      }
    }
  }, () => {
    console.error('Failed to get information.');
  });

  nasne.getReservedListAsync().then((data) => {
    const errorList = data.item.filter((item) => item.conflictId > 0)
      .sort((a, b) => moment(a.startDateTime) - moment(b.startDateTime));

    const fields = errorList.map((item) => {
      const startTime = moment(item.startDateTime).format('YYYY/MM/DD(ddd) HH:mm');
      const endTime = moment(item.startDateTime).add(item.duration, 's').format('HH:mm');
      return {
        title: item.title,
        value: `${startTime} - ${endTime}`,
        short: false
      };
    });

    slack.request({
      text: ':warning: Reservations are duplicates.',
      attachments: [{
        color: 'warning',
        fields
      }]
    });
  }, () => {
    console.error('Failed to get information.');
  });
}

execute();
if (program.interval) {
  setInterval(execute, program.interval * 3600 * 1000);
}
