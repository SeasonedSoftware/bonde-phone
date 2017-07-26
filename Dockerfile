FROM node:latest
MAINTAINER Nossas <tech@nossas.org>

RUN mkdir /code
WORKDIR /code

COPY package.json yarn.lock /code/
RUN yarn
COPY . /code

CMD ["yarn", "start"]
