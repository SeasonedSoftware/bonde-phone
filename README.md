# Twilio micro-service
Enable the activist to pressure through phone

## Requirements
- Git
- [Node.js](https://nodejs.org) >= v8.1.2
- [Yarn](https://yarnpkg.com) or NPM
- [ngrok](https://ngrok.com)

## Install
- `yarn install` or `npm install`

## Run
- Execute the [ngrok](https://ngrok.com) tunnel e.g. `ngrok http -region au 7000`
- Create a **.env** file based on **.env.example** `cp .env.example .env`
- Fill up the environment variables into the **.env** file
- `yarn dev`
