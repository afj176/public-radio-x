export interface RadioStation {
  id: string;
  name: string;
  streamUrl: string;
  genre: string;
  // Optional: add more details like bitrate, logoUrl, etc.
}

// Sample hardcoded radio stations
export const stations: RadioStation[] = [
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
