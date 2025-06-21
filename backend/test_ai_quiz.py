import asyncio
import sys
import os

# Add the src directory to the path
sys.path.append(os.path.join(os.path.dirname(__file__), 'src'))

from src.aiquiz.router import generate_ai_quiz

async def test_ai_quiz():
    """Test the AI quiz generation"""
    try:
        print("Testing AI Quiz Generation...")
        print("=" * 50)
        
        # Test different sports and levels
        test_cases = [
            "make a quiz for football for level easy",
            "make a quiz for basketball for level medium", 
            "make a quiz for tennis for level hard",
            "make a quiz for cricket for level easy"
        ]
        
        for i, test_case in enumerate(test_cases, 1):
            print(f"\nTest {i}: {test_case}")
            print("-" * 30)
            
            try:
                questions = await generate_ai_quiz(test_case)
                print(f"✅ Success! Generated {len(questions)} questions")
                
                # Show first question as example
                if questions:
                    first_q = questions[0]
                    print(f"Sample question: {first_q['question']}")
                    print(f"Correct answer: {first_q['correctAnswer']}")
                    if 'explanation' in first_q:
                        print(f"Explanation: {first_q['explanation']}")
                
            except Exception as e:
                print(f"❌ Error: {str(e)}")
        
        print("\n" + "=" * 50)
        print("Test completed!")
        
    except Exception as e:
        print(f"Test failed: {str(e)}")

if __name__ == "__main__":
    asyncio.run(test_ai_quiz()) 