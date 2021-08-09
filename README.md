nasne-checker
===
[![npm version](https://badge.fury.io/js/nasne-checker.svg)](https://badge.fury.io/js/nasne-checker)

A tool to check resavation on nasne and post to slack.

## Install

```bash
$ npm i nasne-checker -g
```

## Usage

```
Usage: nasne-checker [options]

Options:

  -h, --help             output usage information
  -V, --version          output the version number
  --nasne <host>         Nasne host (required)
  --slack <url>          Slack webhook url (required)
  --cron <format>        Cron format (optional)
  --timezone <timezone>  When using cron option (Default is "Asia/Tokyo")
```

Example:
```bash
$ nasne-checker \
  --nasne 192.168.10.10 \
  --slack https://hooks.slack.com/services/XXX/XXX/XXXXX \
  --cron "00 20 * * 1,3,5"
```

## Changelog
* 1.0.0: First release.
* 1.1.0: Support the case the reservation does not exist.
* 1.1.1: Remove nasne module.
* 1.1.2: Fix the message.
* 1.1.3: Fix interval option bug.
* 1.2.0: Add cron option and remove interval option.
* 1.2.1: Fix a bug that is executed first once when the cron option is enabled.
* 1.2.2: Update dependencies
* 2.0.0: Update dependencies and drop support for Node.js 10.x and 11.x.

## License
MIT
