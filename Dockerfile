FROM node:22-alpine
WORKDIR /app
RUN apk add --no-cache openssl ffmpeg
COPY package.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["sh", "-c", "npx prisma migrate deploy && npm start"]
