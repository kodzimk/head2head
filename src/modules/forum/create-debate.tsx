import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader } from '../../shared/ui/card';
import { Button } from '../../shared/ui/button';
import { Textarea } from '../../shared/ui/textarea';
import { Label } from '../../shared/ui/label';
import { ArrowLeft } from 'lucide-react';
import Header from '../dashboard/header';

interface CreateDebateForm {
  title: string;
  description: string;
  sport: string;
}

export default function CreateDebate() {
  const navigate = useNavigate();

  const [form, setForm] = useState<CreateDebateForm>({
    title: '',
    description: '',
    sport: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const sports = [
    'Football',
    'Basketball',
    'Tennis',
    'Baseball',
    'Soccer',
    'Hockey',
    'Volleyball'
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isSubmitting) return;
    
    try {
      setIsSubmitting(true);
      setValidationErrors({});

      // Validate form
      if (!form.title.trim()) {
        setValidationErrors(prev => ({
          ...prev,
          title: 'Title is required'
        }));
        return;
      }

      if (!form.description.trim()) {
        setValidationErrors(prev => ({
          ...prev,
          description: 'Description is required'
        }));
        return;
      }

      if (!form.sport) {
        setValidationErrors(prev => ({
          ...prev,
          sport: 'Please select a sport'
        }));
        return;
      }

      // Mock API call - in real app, this would send to backend
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Generate mock ID - in real app, this would come from backend
      const debateId = `debate-${Date.now()}`;

      // Navigate to the new debate
      navigate(`/forum/debates/${debateId}`);
    } catch (error) {
      console.error('Error creating debate:', error);
      setValidationErrors(prev => ({
        ...prev,
        submit: 'Failed to create debate. Please try again.'
      }));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear validation error when field is changed
    if (validationErrors[name]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container mx-auto px-4 py-6 max-w-3xl">
        <Button 
          variant="ghost" 
          onClick={() => navigate('/forum')}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Forum
        </Button>

        <Card>
          <CardHeader>
            <h1 className="text-2xl font-bold">Create a New Debate</h1>
            <p className="text-muted-foreground">
              Start a discussion about a controversial topic in sports
            </p>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="title">Debate Title</Label>
                <Textarea
                  id="title"
                  name="title"
                  value={form.title}
                  onChange={handleChange}
                  placeholder="e.g., Should VAR be removed from football?"
                  maxLength={100}
                  className={`resize-none min-h-[100px] ${validationErrors.title ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                />
                {validationErrors.title && (
                  <p className="text-sm text-destructive">{validationErrors.title}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  {form.title.length}/100 characters
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  placeholder="Explain your debate topic. What are the key points for and against?"
                  maxLength={2000}
                  className={`min-h-[200px] resize-none ${validationErrors.description ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                />
                {validationErrors.description && (
                  <p className="text-sm text-destructive">{validationErrors.description}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  {form.description.length}/2000 characters
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sport">Sport</Label>
                  <select
                    id="sport"
                    name="sport"
                    value={form.sport}
                    onChange={handleChange}
                    className={`flex h-11 w-full rounded-md border ${
                      validationErrors.sport ? 'border-destructive' : 'border-input'
                    } bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50`}
                  >
                    <option value="">Select a sport</option>
                    {sports.map(sport => (
                      <option key={sport} value={sport}>
                        {sport}
                      </option>
                    ))}
                  </select>
                  {validationErrors.sport && (
                    <p className="text-sm text-destructive">{validationErrors.sport}</p>
                  )}
                </div>
              </div>

              {validationErrors.submit && (
                <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                  {validationErrors.submit}
                </div>
              )}

              <div className="flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/forum')}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Creating...' : 'Create Debate'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 