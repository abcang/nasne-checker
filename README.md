nasne-checker
===
[![npm version](https://badge.fury.io/js/nasne-checker.svg)](https://badge.fury.io/js/nasne-checker)

A tool to check resavation on nasne and to post to slack.

## Install

```bash
$ npm i nasne-checker -g
```

## Usage

```
Usage: nasne-checker [options]

Options:

  -h, --help         output usage information
  -V, --version      output the version number
  --nasne <host>     Nasne host (required)
  --slack <url>      Slack webhook url (required)
  --interval [hour]  Execution interval
```

Example:
```bash
$ nasne-checker --nasne 192.168.10.10 \
  --slack https://hooks.slack.com/services/XXX/XXX/XXXXX \
  --interval 24
```

## License
MIT
