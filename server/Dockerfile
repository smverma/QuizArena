# QuizArena Backend – Cloud Run image

FROM node:20-alpine

WORKDIR /app

# Install dependencies first for better layer caching
COPY package.json ./
RUN npm install --omit=dev

COPY . .

# Cloud Run sets PORT automatically; default to 8080
ENV PORT=8080

EXPOSE 8080
CMD ["node", "index.js"]
