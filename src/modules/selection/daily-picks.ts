import type { Pick } from './types';

const STORAGE_KEY = 'daily_picks';
const LAST_UPDATE_KEY = 'last_picks_update';
const VOTES_STORAGE_KEY = 'pick_votes';

// Available sports categories
const SPORTS_CATEGORIES = [
  'football',  // Most popular globally
  'basketball', // Huge following worldwide
  'boxing',    // Major combat sport
  'mma',       // Growing combat sport
  'tennis',    // Popular individual sport
  'baseball'   // Popular in certain regions
] as const;

// Sample picks data for each sport
const PICKS_DATABASE: Record<string, Pick[]> = {
  football: [
    {
      id: 'football_1',
      option1_name: 'Lionel Messi',
      option1_image: '/images/placeholder-user.jpg',
      option1_votes: 0,
      option2_name: 'Cristiano Ronaldo',
      option2_image: '/images/placeholder-user.jpg',
      option2_votes: 0,
      category: 'football',
      createdAt: new Date()
    },
    {
      id: 'football_2',
      option1_name: 'Kylian Mbappé',
      option1_image: '/images/placeholder-user.jpg',
      option1_votes: 0,
      option2_name: 'Erling Haaland',
      option2_image: '/images/placeholder-user.jpg',
      option2_votes: 0,
      category: 'football',
      createdAt: new Date()
    }
  ],
  basketball: [
    {
      id: 'basketball_1',
      option1_name: 'LeBron James',
      option1_image: '/images/placeholder-user.jpg',
      option1_votes: 0,
      option2_name: 'Michael Jordan',
      option2_image: '/images/placeholder-user.jpg',
      option2_votes: 0,
      category: 'basketball',
      createdAt: new Date()
    },
    {
      id: 'basketball_2',
      option1_name: 'Stephen Curry',
      option1_image: '/images/placeholder-user.jpg',
      option1_votes: 0,
      option2_name: 'Kevin Durant',
      option2_image: '/images/placeholder-user.jpg',
      option2_votes: 0,
      category: 'basketball',
      createdAt: new Date()
    }
  ],
  tennis: [
    {
      id: 'tennis_1',
      option1_name: 'Roger Federer',
      option1_image: '/images/placeholder-user.jpg',
      option1_votes: 0,
      option2_name: 'Rafael Nadal',
      option2_image: '/images/placeholder-user.jpg',
      option2_votes: 0,
      category: 'tennis',
      createdAt: new Date()
    }
  ],
  boxing: [
    {
      id: 'boxing_1',
      option1_name: 'Muhammad Ali',
      option1_image: '/images/placeholder-user.jpg',
      option1_votes: 0,
      option2_name: 'Mike Tyson',
      option2_image: '/images/placeholder-user.jpg',
      option2_votes: 0,
      category: 'boxing',
      createdAt: new Date()
    }
  ],
  mma: [
    {
      id: 'mma_1',
      option1_name: 'Khabib Nurmagomedov',
      option1_image: '/images/placeholder-user.jpg',
      option1_votes: 0,
      option2_name: 'Conor McGregor',
      option2_image: '/images/placeholder-user.jpg',
      option2_votes: 0,
      category: 'mma',
      createdAt: new Date()
    }
  ],
  baseball: [
    {
      id: 'baseball_1',
      option1_name: 'Babe Ruth',
      option1_image: '/images/placeholder-user.jpg',
      option1_votes: 0,
      option2_name: 'Barry Bonds',
      option2_image: '/images/placeholder-user.jpg',
      option2_votes: 0,
      category: 'baseball',
      createdAt: new Date()
    }
  ]
};

// Helper function to get a random item from an array
const getRandomItem = <T>(array: T[]): T => {
  return array[Math.floor(Math.random() * array.length)];
};

// Generate new picks for the day
const generateDailyPicks = (): Pick[] => {
  // Get one pick from each sport category
  return SPORTS_CATEGORIES.map(category => {
    const availablePicks = PICKS_DATABASE[category];
    return getRandomItem(availablePicks);
  });
};

// Check if picks need to be updated (24 hours have passed)
const shouldUpdatePicks = (): boolean => {
  const lastUpdate = localStorage.getItem(LAST_UPDATE_KEY);
  if (!lastUpdate) return true;

  const lastUpdateTime = new Date(lastUpdate).getTime();
  const currentTime = new Date().getTime();
  const hoursPassed = (currentTime - lastUpdateTime) / (1000 * 60 * 60);

  return hoursPassed >= 24;
};

// Save votes to localStorage
export const saveVotes = (pickId: string, option1Votes: number, option2Votes: number) => {
  const votesData = localStorage.getItem(VOTES_STORAGE_KEY);
  const votes = votesData ? JSON.parse(votesData) : {};
  
  votes[pickId] = {
    option1_votes: option1Votes,
    option2_votes: option2Votes
  };
  
  localStorage.setItem(VOTES_STORAGE_KEY, JSON.stringify(votes));
};

// Load votes from localStorage
export const loadVotes = (pickId: string): { option1_votes: number; option2_votes: number } => {
  const votesData = localStorage.getItem(VOTES_STORAGE_KEY);
  const votes = votesData ? JSON.parse(votesData) : {};
  
  return votes[pickId] || { option1_votes: 0, option2_votes: 0 };
};

// Get current daily picks with persisted votes
export const getDailyPicks = (): Pick[] => {
  if (shouldUpdatePicks()) {
    const newPicks = generateDailyPicks();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newPicks));
    localStorage.setItem(LAST_UPDATE_KEY, new Date().toISOString());
    // Clear old votes when picks rotate
    localStorage.setItem(VOTES_STORAGE_KEY, '{}');
    return newPicks;
  }

  const storedPicks = localStorage.getItem(STORAGE_KEY);
  const picks = storedPicks ? JSON.parse(storedPicks) : generateDailyPicks();
  
  // Load persisted votes for each pick
  return picks.map((pick: Pick) => {
    const votes = loadVotes(pick.id);
    return {
      ...pick,
      option1_votes: votes.option1_votes,
      option2_votes: votes.option2_votes
    };
  });
};

// Get time until next rotation
export const getTimeUntilNextRotation = (): number => {
  const lastUpdate = localStorage.getItem(LAST_UPDATE_KEY);
  if (!lastUpdate) return 0;

  const lastUpdateTime = new Date(lastUpdate).getTime();
  const currentTime = new Date().getTime();
  const timeLeft = (24 * 60 * 60 * 1000) - (currentTime - lastUpdateTime);

  return Math.max(0, timeLeft);
};

// Get formatted time until next rotation
export const getFormattedTimeUntilNextRotation = (): string => {
  const timeLeft = getTimeUntilNextRotation();
  const hours = Math.floor(timeLeft / (1000 * 60 * 60));
  const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));

  return `${hours}h ${minutes}m`;
}; 