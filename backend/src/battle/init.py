from fastapi import APIRouter

battle_router = APIRouter()


sampleQuestions = [
  {
    "id": 1,
    "question": "What is the capital of France?",
    "answers": [
      { "label": 'A', "text": 'Berlin' },
      { "label": 'B', "text": 'Madrid' },
      { "label": 'C', "text": 'Paris' },
      { "label": 'D', "text": 'Rome' },
    ],
    "correctAnswer": 'C',
  },
  {
    "id": 2,
    "question": 'Which planet is known as the Red Planet?',
    "answers": [
      { "label": 'A', "text": 'Venus' },
      { "label": 'B', "text": 'Mars' },
      { "label": 'C', "text": 'Jupiter' },
      { "label": 'D', "text": 'Saturn' },
    ],
    "correctAnswer": 'B',
  },
  {
    "id": 3,
    "question": 'What is the largest ocean on Earth?',
    "answers": [
      { "label": 'A', "text": 'Atlantic Ocean' },
      { "label": 'B', "text": 'Indian Ocean' },
      { "label": 'C', "text": 'Arctic Ocean' },
      { "label": 'D', "text": 'Pacific Ocean' },
    ],
    "correctAnswer": 'D',
  },
];


class Battle:
    def __init__(self, id: str,first_opponent: str,sport: str,duration: int):
        self.id = id
        self.questions = sampleQuestions
        self.current_question = 0
        self.first_opponent_answers = -1
        self.second_opponent_answers = -1
        self.first_opponent_score = 0
        self.second_opponent_score = 0
        self.first_opponent = first_opponent
        self.second_opponent = ''
        self.sport = sport
        self.duration = duration
        

    def get_question(self,index: int):
        print(self.first_opponent_answers,self.second_opponent_answers)
        if index == 0:
            if len(self.questions) == self.first_opponent_answers:
                return {"question": "No more questions", "answers": []}
            question = self.questions[self.first_opponent_answers]
            self.first_opponent_answers += 1
        else:
            if len(self.questions) == self.second_opponent_answers:
                return {"question": "No more questions", "answers": []}
            question = self.questions[self.second_opponent_answers]
            self.second_opponent_answers += 1
        return question
    
    def check_for_answer(self,username: str,answer: str):
        if username == self.first_opponent:
            if answer == self.questions[self.first_opponent_answers - 1]["correctAnswer"]:
                print("first_opponent_answers",self.first_opponent_answers)
                self.first_opponent_score += 1
            return 0
        else:
            if answer == self.questions[self.second_opponent_answers - 1]["correctAnswer"]:       
                self.second_opponent_score += 1
            return 1
    
battles = {key: value for key, value in []}