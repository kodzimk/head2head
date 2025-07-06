import React, { useState } from 'react';
import { Button } from '../../shared/ui/button';
import { Textarea } from '../../shared/ui/textarea';
import { MessageCircle, Heart } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Comment } from './types.js';

interface CommentsProps {
  comments: Comment[];
  onAddComment: (content: string) => void;
  onLikeComment: (commentId: string) => void;
}

export default function Comments({ comments, onAddComment, onLikeComment }: CommentsProps) {
  const { t } = useTranslation();
  const [newComment, setNewComment] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newComment.trim()) {
      onAddComment(newComment.trim());
      setNewComment('');
    }
  };

  return (
    <div className="space-y-6">
      {/* Add Comment Form */}
      <form onSubmit={handleSubmit} className="space-y-2">
        <Textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder={t('selection.addComment')}
          className="min-h-[80px]"
        />
        <Button type="submit" disabled={!newComment.trim()}>
          <MessageCircle className="w-4 h-4 mr-2" />
          {t('selection.addComment')}
        </Button>
      </form>

      {/* Comments List */}
      <div className="space-y-4">
        {comments.map((comment) => (
          <div key={comment.id} className="space-y-2">
            <div className="flex items-start gap-3">
          
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  
                  <span className="text-sm text-muted-foreground">{comment.timestamp}</span>
                </div>
                <p className="text-sm">{comment.content}</p>
                <div className="flex items-center gap-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onLikeComment(comment.id)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <Heart className="w-4 h-4 mr-1" />
                    {comment.likes} {t('selection.like')}
                  </Button>

                </div>
              </div>
            </div>

          </div>
        ))}
      </div>
    </div>
  );
} 