import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { startBattle } from '../../shared/websockets/websocket';

export default function BattleCountdown() {
  const { id } = useParams() as { id: string };
  const navigate = useNavigate();
  const [count, setCount] = useState(3);

  useEffect(() => {
    if (count === 0) {
      startBattle(id);
      setTimeout(() => {
        navigate(`/battle/${id}/quiz`);
      }, 100);
     
      return;
    }
    const timer = setTimeout(() => setCount(count - 1), 1000);
    return () => clearTimeout(timer);
  }, [count, id, navigate]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-900">
      <div className="text-6xl font-bold text-orange-500 mb-4">{count === 0 ? 'Go!' : count}</div>
      <div className="text-xl text-gray-700 dark:text-gray-200">Get ready for the quiz!</div>
    </div>
  );
}