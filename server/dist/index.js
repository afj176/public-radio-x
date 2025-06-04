"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const morgan_1 = __importDefault(require("morgan"));
const helmet_1 = __importDefault(require("helmet"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const port = process.env.PORT || 3000;
// Middleware
app.use((0, morgan_1.default)('dev'));
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Simple route for testing
app.get('/', (req, res) => {
    res.send('Radio Streamer Server is running!');
});
// Import station routes
const stationRoutes_1 = __importDefault(require("./routes/stationRoutes"));
// Mount station routes
app.use('/api/stations', stationRoutes_1.default);
app.listen(port, () => {
    console.log(`[server]: Server is running at http://localhost:${port}`);
});
exports.default = app;
