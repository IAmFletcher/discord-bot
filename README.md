# discord-bot

[![JavaScript Style Guide][js-standard-image]][js-standard-url]
[![Conventional Commits][conventional-commits-image]][conventional-commits-url]
[![Twitch Status][twitch-shields-image]][twitch-url]

A simple Discord bot written in Node.js that assigns roles when you react to messages.

## Installation

1) Clone the repo

```
$ git clone https://github.com/IAmFletcher/discord-bot.git

// OR

$ git clone git@github.com:IAmFletcher/discord-bot.git
```

2) Install the dependencies

```
$ yarn install // All dependencies

// OR

$ yarn install --production // Only production dependencies
```

3) Run

```
$ yarn start
```

### Prerequisites

1) Install [MariaDB](https://mariadb.org/) and [yarn](https://yarnpkg.com/)

We use MariaDB, not MySQL, because the bot is only set-up to enable unicode emoji support in MariaDB.

2) [Create Discord application](https://discordapp.com/developers/applications/)
    - Take note of Client ID
    - Go to Bot tab and Add Bot
    - Take note of Bot Token

3) Add bot to a Discord server

Fill in the Client ID and follow this link: https://discordapp.com/api/oauth2/authorize?client_id=${CLIENT_ID}&permissions=268501056&scope=bot

4) Set-up environment variables

```env
DiscordBotID={ClientID}
DiscordBotToken={BotToken}
SQLUser=
SQLPassword=
```

## Contributing

If you'd like to contribute to the project, please read the [Contributing Guidelines](CONTRIBUTING.md) first.

## License

[MIT](LICENSE)

[js-standard-image]: https://img.shields.io/badge/code_style-semistandard-brightgreen.svg
[js-standard-url]: https://standardjs.com
[conventional-commits-image]: https://img.shields.io/badge/Conventional%20Commits-1.0.0-yellow.svg
[conventional-commits-url]: https://conventionalcommits.org/
[twitch-shields-image]: https://img.shields.io/twitch/status/IAmFletcher_
[twitch-url]: https://twitch.tv/IAmFletcher_
