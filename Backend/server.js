import express from "express";
import "dotenv/config";
import cors from "cors";
import mongoose from "mongoose";
import chatRoutes from "./routes/chat.js";

const app = express();
const PORT = 8080;

app.use(express.json());
app.use(cors());

const connectDB = async () => {
    if (mongoose.connection.readyState >= 1) return;
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("Connected with Database!");
    } catch(err) {
        console.log("Failed to connect with Db", err);
    }
}

// Assure DB connection on every request (crucial for serverless lifecycle)
app.use(async (req, res, next) => {
    await connectDB();
    next();
});

app.use("/api", chatRoutes);

if (process.env.NODE_ENV !== "production") {
    app.listen(PORT, () => {
        console.log(`server running on ${PORT}`);
    });
}

export default app;

