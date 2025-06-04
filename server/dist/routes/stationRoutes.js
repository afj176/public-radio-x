"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const router = (0, express_1.Router)();
// Sample hardcoded radio stations
const stations = [
    {
        id: '1',
        name: 'Classic Rock Hits',
        streamUrl: 'http://stream.example.com/classic-rock',
        genre: 'Classic Rock',
    },
    {
        id: '2',
        name: 'Jazz Vibes',
        streamUrl: 'http://stream.example.com/jazz-vibes',
        genre: 'Jazz',
    },
    {
        id: '3',
        name: 'Chillhop Lo-Fi',
        streamUrl: 'http://stream.example.com/chillhop',
        genre: 'Electronic',
    },
    {
        id: '4',
        name: 'Country Roads',
        streamUrl: 'http://stream.example.com/country-roads',
        genre: 'Country',
    },
    {
        id: '5',
        name: 'Pop Party',
        streamUrl: 'http://stream.example.com/pop-party',
        genre: 'Pop',
    },
];
// GET /api/stations - Returns the list of all radio stations
router.get('/', (req, res) => {
    res.json(stations);
});
// GET /api/stations/:id - Returns a specific radio station by its ID
router.get('/:id', (req, res) => {
    const station = stations.find((s) => s.id === req.params.id);
    if (station) {
        res.json(station);
    }
    else {
        res.status(404).json({ message: 'Station not found' });
    }
});
exports.default = router;
