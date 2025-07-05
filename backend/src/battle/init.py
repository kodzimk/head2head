from fastapi import APIRouter

battle_router = APIRouter()

class Battle:
    def __init__(self, id: str,first_opponent: str,sport: str,level: str):
        self.id = id
        self.questions = []
        self.current_question = 0
        self.first_opponent_answers = 0
        self.second_opponent_answers = 0
        self.first_opponent_score = 0
        self.second_opponent_score = 0
        self.first_opponent = first_opponent
        self.second_opponent = ''
        self.sport = sport
        self.level = level
        self.first_opponent_finished = False
        self.second_opponent_finished = False       

    def get_question(self,index: int):
       
        if index == 0:
            if len(self.questions) <= self.first_opponent_answers:
                print("first_opponent_finished")
                self.first_opponent_finished = True
                return {"question": "No more questions", "answers": []}
            question = self.questions[self.first_opponent_answers]
        else:
            if len(self.questions) <= self.second_opponent_answers:
                print("second_opponent_finished")
                self.second_opponent_finished = True
                return {"question": "No more questions", "answers": []}
            question = self.questions[self.second_opponent_answers]
        return question
    
    def check_for_answer(self,username: str,answer: str):
        if username == self.first_opponent:
            if self.first_opponent_answers < len(self.questions):
                self.first_opponent_answers += 1
                q = self.questions[self.first_opponent_answers - 1]
                if "correctAnswer" in q:
                    if answer == q["correctAnswer"]:
                        self.first_opponent_score += 1
                else:
                    print(f"[Warning] Question missing 'correctAnswer': {q}")
            return 0
        else:
            if self.second_opponent_answers < len(self.questions):
                self.second_opponent_answers += 1
                q = self.questions[self.second_opponent_answers - 1]
                if "correctAnswer" in q:
                    if answer == q["correctAnswer"]:
                        self.second_opponent_score += 1
                else:
                    print(f"[Warning] Question missing 'correctAnswer': {q}")
            return 1
        
    def check_for_winner(self):
    
      if self.first_opponent_finished ==  True and self.second_opponent_finished == True:
        if self.first_opponent_score == self.second_opponent_score:
            return "draw"
        elif self.first_opponent_score > self.second_opponent_score:
            return self.first_opponent
        else:
            return self.second_opponent
      else:
        return "nothing"
    
battles = {key: value for key, value in []}