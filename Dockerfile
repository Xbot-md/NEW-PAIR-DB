FROM node:lts-buster
USER root
RUN apt-get update && \
    apt-get install -y ffmpeg webp git && \
    apt-get upgrade -y && \
    rm -rf /var/lib/apt/lists/*
USER node
RUN git clone https://github.com/Xbot-md/NEW-PAIR-DB.git /home/node/NEW-PAIR-DB
WORKDIR /home/node/NEW-PAIR-DB
RUN chmod -R 777 /home/node/NEW-PAIR-DB/
RUN yarn install --network-concurrency 1
EXPOSE 3000
ENV NODE_ENV=production
CMD ["npm", "start"]
