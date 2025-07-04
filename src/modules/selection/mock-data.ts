import type { Selection } from './types';

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
        likes: 5,
        timestamp: '2024-03-20T10:00:00Z',
        replies: [
          {
            id: '2',
            content: 'Agreed! His low center of gravity gives him incredible control.',
            author: 'TacticsExpert',
            likes: 3,
            timestamp: '2024-03-20T10:30:00Z',
            replies: [],
            likedBy: ['SportsAnalyst', 'FootballFan', 'You'],
            parentId: '1'
          }
        ],
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
        likes: 8,
        timestamp: '2024-03-19T15:00:00Z',
        replies: [
          {
            id: '4',
            content: 'The Last Dance documentary really showed his winning mentality.',
            author: 'SportsHistorian',
            likes: 4,
            timestamp: '2024-03-19T15:45:00Z',
            replies: [],
            likedBy: ['BasketballLegend', 'NBAFan', 'You', 'Coach'],
            parentId: '3'
          }
        ],
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
        likes: 12,
        timestamp: '2024-03-18T09:00:00Z',
        replies: [
          {
            id: '6',
            content: 'Almost 5 hours of incredible tennis. A true classic!',
            author: 'GrandSlamFan',
            likes: 6,
            timestamp: '2024-03-18T09:30:00Z',
            replies: [],
            likedBy: ['TennisExpert', 'You', 'SportsHistorian', 'Coach', 'SportsAnalyst', 'TacticsExpert'],
            parentId: '5'
          }
        ],
        likedBy: ['GrandSlamFan', 'SportsHistorian', 'Coach', 'You', 'TennisExpert', 'TacticsExpert', 'SportsAnalyst', 'FootballFan', 'BasketballLegend', 'NBAFan', 'SportsAnalyst', 'FootballFan']
      }
    ]
  }
]; 