FROM node:lts-alpine

COPY package.json package-lock.json /src/

WORKDIR /app
RUN npm install --production
COPY . /app

EXPOSE 3000

WORKDIR /
ENTRYPOINT ["node", "/app/bin/main.js"]
CMD [".", "src"]
