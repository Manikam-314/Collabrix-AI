const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const http = require("http");

const authRouter = require("./Route/auth");
const meetingRoute = require("./Route/meeting");
const aiRoute = require("./Route/meetingSummary")

const { setupWebSocket } = require("./webSocket/wsServer");


const app = express();

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "OPTIONS, GET, POST, PUT, PATCH, DELETE"
  );
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

app.use(bodyParser.json());

app.use("/auth", authRouter);
app.use("/meetings", meetingRoute);
app.use("/meetingAi", aiRoute);

const server = http.createServer(app);

const { MongoMemoryServer } = require("mongodb-memory-server");

async function startServer() {
  const mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();

  mongoose
    .connect(mongoUri)
    .then(() => {
      console.log("✅ In-memory MongoDB connected");

      server.listen(8080, () => {
        console.log("🚀 Server running at http://54.90.225.145:8080");
      });

      setupWebSocket(server)
    })
    .catch((err) => {
      console.error("❌ MongoDB connection error:", err.message);
    });
}

startServer();
