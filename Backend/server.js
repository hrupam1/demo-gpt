import express from "express";
import "dotenv/config";
import cors from "cors";
import chatRoutes from "./routes/chat.js";

const app = express();
const PORT = 8080;

app.use(express.json());
app.use(cors());

app.use("/api", chatRoutes);
app.use("/", chatRoutes);

if (process.env.NODE_ENV !== "production") {
    app.listen(PORT, () => {
        console.log(`server running on ${PORT}`);
    });
}

export default app;

