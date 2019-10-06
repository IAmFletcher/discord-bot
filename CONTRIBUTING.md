# Contributing Guidelines

## Bug Reports

1) Make sure you are testing against the latest version
2) Make sure an issue doesn't already exist
3) If you've done both of these, [create an Issue](https://github.com/IAmFletcher/discord-bot/issues/new) with the steps to reproduce

## Feature Requests

This is not intended to be a complete Discord chat bot. If your feature request doesn't deal with role management, it will be closed.

1) Make sure an issue doesn't already exist
2) If you've done this, [create an Issue](https://github.com/IAmFletcher/discord-bot/issues/new) which describes the feature, and why it's needed

## Contributing Code

1) Make sure an Issue exists
  - If yes, ask if you can tackle it
  - If no, create one
2) Fork the `develop` branch

```
$ git clone git@github.com:IAmFletcher/discord-bot.git
$ cd discord-bot
$ git checkout develop
```

3) Make sure all commits follow [Conventional Commits]()

```
feature: // Adding a new feature
fix: // Fixing a bug
refactor: // A code change that neither fixes a bug nor adds a feature
docs: // Change docs like README, CONTRIBUTING, etc.
```

If you're not sure which one to use, feel free to ask in the relevant issue.
