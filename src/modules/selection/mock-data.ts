import type { Selection, Pick, Comment } from './types';

export const mockSelections: Selection[] = [
  {
    id: '1',
    category: 'football',
    teamA: {
      name: 'Lionel Messi',
      image: '/images/messi.jpg',
      votes: 150,
      description: 'Argentine professional footballer, widely regarded as one of the greatest players of all time.'
    },
    teamB: {
      name: 'Cristiano Ronaldo',
      image: '/images/ronaldo.jpg',
      votes: 120,
      description: 'Portuguese professional footballer, known for his incredible athleticism and goal-scoring ability.'
    },
    comments: [
      {
        id: '1',
        content: 'Messi\'s dribbling skills are unmatched!',
        author: 'FootballFan',
        likes: [],
       
        timestamp: '2024-03-20T10:00:00Z',
        likedBy: ['TacticsExpert', 'SportsAnalyst', 'FootballFan', 'You', 'Coach']
      }
    ]
  },
  {
    id: '2',
    category: 'basketball',
    teamA: {
      name: 'LeBron James',
      image: '/images/lebron.jpg',
      votes: 100,
      description: 'American professional basketball player, considered one of the greatest NBA players in history.'
    },
    teamB: {
      name: 'Michael Jordan',
      image: '/images/jordan.jpg',
      votes: 110,
      description: 'Former American professional basketball player, six-time NBA champion and cultural icon.'
    },
    comments: [
      {
        id: '3',
        content: 'Jordan\'s competitiveness was on another level!',
        author: 'BasketballLegend',
        likes: [],
       
        timestamp: '2024-03-19T15:00:00Z',
       
        likedBy: ['SportsHistorian', 'NBAFan', 'Coach', 'You', 'BasketballLegend', 'TacticsExpert', 'SportsAnalyst', 'FootballFan']
      }
    ]
  },
  {
    id: '3',
    category: 'tennis',
    teamA: {
      name: 'Roger Federer',
      image: '/images/federer.jpg',
      votes: 90,
      description: 'Swiss former professional tennis player, known for his elegant style and 20 Grand Slam titles.'
    },
    teamB: {
      name: 'Rafael Nadal',
      image: '/images/nadal.jpg',
      votes: 85,
      description: 'Spanish professional tennis player, known as the "King of Clay" with 22 Grand Slam titles.'
    },
    comments: [
      {
        id: '5',
        content: 'Their 2008 Wimbledon final was the greatest match ever!',
        author: 'TennisExpert',
        likes: [],
        timestamp: '2024-03-18T09:00:00Z',
       
        likedBy: ['GrandSlamFan', 'SportsHistorian', 'Coach', 'You', 'TennisExpert', 'TacticsExpert', 'SportsAnalyst', 'FootballFan', 'BasketballLegend', 'NBAFan', 'SportsAnalyst', 'FootballFan']
      }
    ]
  }
];

// Mock picks data with realistic debate topics
export const mockPicks: Pick[] = [
  {
    id: '1',
    option1_name: 'Lionel Messi',
    option1_image: 'https://placehold.co/400x400/000000/FFFFFF?text=Messi',
    option1_votes: 1247,
    option2_name: 'Cristiano Ronaldo',
    option2_image: 'https://placehold.co/400x400/333333/FFFFFF?text=Ronaldo',
    option2_votes: 1156,
    category: 'football',
    createdAt: new Date('2024-01-15')
  },
  {
    id: '2',
    option1_name: 'Michael Jordan',
    option1_image: 'https://placehold.co/400x400/777777/FFFFFF?text=Jordan',
    option1_votes: 892,
    option2_name: 'LeBron James',
    option2_image: 'https://placehold.co/400x400/555555/FFFFFF?text=LeBron',
    option2_votes: 1034,
    category: 'basketball',
    createdAt: new Date('2024-01-14')
  },
  {
    id: '3',
    option1_name: 'Kobe Bryant',
    option1_image: 'https://placehold.co/400x400/8B5CF6/FFFFFF?text=Kobe',
    option1_votes: 673,
    option2_name: 'Tim Duncan',
    option2_image: 'https://placehold.co/400x400/10B981/FFFFFF?text=Duncan',
    option2_votes: 445,
    category: 'basketball',
    createdAt: new Date('2024-01-13')
  },
  {
    id: '4',
    option1_name: 'Serena Williams',
    option1_image: 'https://placehold.co/400x400/F59E0B/FFFFFF?text=Serena',
    option1_votes: 567,
    option2_name: 'Steffi Graf',
    option2_image: 'https://placehold.co/400x400/EF4444/FFFFFF?text=Graf',
    option2_votes: 423,
    category: 'tennis',
    createdAt: new Date('2024-01-12')
  },
  {
    id: '5',
    option1_name: 'Tom Brady',
    option1_image: 'https://placehold.co/400x400/3B82F6/FFFFFF?text=Brady',
    option1_votes: 789,
    option2_name: 'Joe Montana',
    option2_image: 'https://placehold.co/400x400/DC2626/FFFFFF?text=Montana',
    option2_votes: 654,
    category: 'football',
    createdAt: new Date('2024-01-11')
  },
  {
    id: '6',
    option1_name: 'Pelé',
    option1_image: 'https://placehold.co/400x400/059669/FFFFFF?text=Pele',
    option1_votes: 1123,
    option2_name: 'Diego Maradona',
    option2_image: 'https://placehold.co/400x400/7C3AED/FFFFFF?text=Maradona',
    option2_votes: 987,
    category: 'football',
    createdAt: new Date('2024-01-10')
  }
];

// Mock comments data
export const mockComments: Comment[] = [
  {
    id: 'c1',
    pickId: '1',
    authorId: 'user1',
    authorName: 'SoccerFan2024',
    content: 'Messi has more Ballon d\'Or awards, that settles it for me!',
    text: 'Messi has more Ballon d\'Or awards, that settles it for me!',
    author: 'SoccerFan2024',
    likes: ['user2', 'user3', 'user4'],
   

    createdAt: new Date('2024-01-15T10:00:00')
  },
  {
    id: 'c2',
    pickId: '1',
    authorId: 'user3',
    authorName: 'FootballAnalyst',
    content: 'Both are legends, but Messi\'s dribbling is just otherworldly.',
    text: 'Both are legends, but Messi\'s dribbling is just otherworldly.',
    author: 'FootballAnalyst',
    likes: ['user1', 'user4', 'user6'],
   

    createdAt: new Date('2024-01-15T11:00:00')
  },
  {
    id: 'c3',
    pickId: '2',
    authorId: 'user4',
    authorName: 'BasketballGOAT',
    content: 'Jordan never lost a Finals. 6-0 is unbeatable.',
    text: 'Jordan never lost a Finals. 6-0 is unbeatable.',
    author: 'BasketballGOAT',
    likes: ['user2', 'user5'],
   
  
    createdAt: new Date('2024-01-14T15:00:00')
  },
  {
    id: 'c4',
    pickId: '2',
    authorId: 'user5',
    authorName: 'LBJFan',
    content: 'LeBron has more longevity and played in a tougher era.',
    text: 'LeBron has more longevity and played in a tougher era.',
    author: 'LBJFan',
    likes: ['user3', 'user6'],
  
  
    createdAt: new Date('2024-01-14T16:00:00')
  }
];

// Legacy mock data for compatibility
export const mockSelectionsLegacy = [
  {
    id: '1',
    category: 'football',
    teamA: {
      name: 'Lionel Messi',
      description: 'Argentine football legend',
      image: 'https://placehold.co/400x400/000000/FFFFFF?text=Messi',
      votes: 1247
    },
    teamB: {
      name: 'Cristiano Ronaldo',
      description: 'Portuguese football superstar',
      image: 'https://placehold.co/400x400/333333/FFFFFF?text=Ronaldo',
      votes: 1156
    },
    comments: mockComments.filter(c => c.pickId === '1')
  },
  {
    id: '2',
    category: 'basketball',
    teamA: {
      name: 'Michael Jordan',
      description: 'Basketball legend',
      image: 'https://placehold.co/400x400/777777/FFFFFF?text=Jordan',
      votes: 892
    },
    teamB: {
      name: 'LeBron James',
      description: 'Modern basketball GOAT',
      image: 'https://placehold.co/400x400/555555/FFFFFF?text=LeBron',
      votes: 1034
    },
    comments: mockComments.filter(c => c.pickId === '2')
  }
]; 