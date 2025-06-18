import { useState } from 'react';
import { Button } from '../../shared/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../shared/ui/card';
import { useParams } from 'react-router-dom';

const sampleQuestion = {
  question: 'What is the capital of France?',
  answers: [
    { label: 'A', text: 'Berlin' },
    { label: 'B', text: 'Madrid' },
    { label: 'C', text: 'Paris' },
    { label: 'D', text: 'Rome' },
  ],
};

export default function QuizQuestionPage() {
  const { id } = useParams();
  const [selected, setSelected] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const handleSelect = (label: string) => {
    setSelected(label);
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex flex-col items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Compete for GOATNESS</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4 text-lg font-semibold">{sampleQuestion.question}</div>
          <div className="grid gap-3 mb-6">
            {sampleQuestion.answers.map((ans) => (
              <Button
                key={ans.label}
                variant={selected === ans.label ? 'default' : 'outline'}
                className="w-full justify-start"
                onClick={() => handleSelect(ans.label)}
                disabled={submitted}
              >
                <span className="font-bold mr-2">{ans.label}.</span> {ans.text}
              </Button>
            ))}
          </div>
          {submitted && (
            <div className="mt-4 text-center text-green-600 font-semibold">
              {selected === 'C' ? 'Correct!' : 'Incorrect. The correct answer is C.'}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 