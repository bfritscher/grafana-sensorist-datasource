FROM bfritscher/papersim-backend-base

WORKDIR /app
COPY package.json /app/package.json
RUN npm install
COPY index.js /app/index.js
EXPOSE 80
CMD ["supervisor", "--watch", "/app", "index.js"]
