import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader } from '../../shared/ui/card';
import { Button } from '../../shared/ui/button';
import { Textarea } from '../../shared/ui/textarea';
import { Label } from '../../shared/ui/label';
import { Input } from '../../shared/ui/input';
import { ArrowLeft } from 'lucide-react';
import Header from '../dashboard/header';
import { debateService } from '../../shared/services/debate-service';
import type { CreateDebateData } from '../../shared/services/debate-service';
import { useTranslation } from 'react-i18next';

interface CreateDebateForm {
  option1_name: string;
  option1_description: string;
  option2_name: string;
  option2_description: string;
  sport: string;
}

export default function CreateDebate() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [form, setForm] = useState<CreateDebateForm>({
    option1_name: '',
    option1_description: '',
    option2_name: '',
    option2_description: '',
    sport: 'Football'
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});


  // Check authentication on component mount
  useEffect(() => {
    const hasToken = !!localStorage.getItem('access_token');
    const hasUsername = !!localStorage.getItem('username');
    
    if (!hasToken || !hasUsername) {
      navigate('/sign-in');
    }
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isSubmitting) return;
    
    // Check if user is authenticated
    const hasToken = !!localStorage.getItem('access_token');
    const hasUsername = !!localStorage.getItem('username');
    
    if (!hasToken || !hasUsername) {
      navigate('/sign-in');
      return;
    }
    
    try {
      setIsSubmitting(true);
      setValidationErrors({});

      // Validate form
      if (!form.option1_name.trim()) {
        setValidationErrors(prev => ({
          ...prev,
          option1_name: 'First option name is required'
        }));
        return;
      }

      if (!form.option1_description.trim()) {
        setValidationErrors(prev => ({
          ...prev,
          option1_description: 'First option description is required'
        }));
        return;
      }

      if (!form.option2_name.trim()) {
        setValidationErrors(prev => ({
          ...prev,
          option2_name: 'Second option name is required'
        }));
        return;
      }

      if (!form.option2_description.trim()) {
        setValidationErrors(prev => ({
          ...prev,
          option2_description: 'Second option description is required'
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

      // Create debate data
      const debateData: CreateDebateData = {
        option1_name: form.option1_name.trim(),
        option1_description: form.option1_description.trim(),
        option2_name: form.option2_name.trim(),
        option2_description: form.option2_description.trim(),
        category: form.sport // Use sport as category for backend compatibility
      };

      // Create debate via API
      const newDebate = await debateService.createDebate(debateData);

      // Navigate to the new debate
      navigate(`/selection/${newDebate.id}`);
    } catch (error: any) {
      console.error('Error creating debate:', error);
      if (error.message?.includes('Authorization header missing') || error.message?.includes('401')) {
        // Only redirect if not authenticated
        const hasToken = !!localStorage.getItem('access_token');
        const hasUsername = !!localStorage.getItem('username');
        
        if (!hasToken || !hasUsername) {
          navigate('/sign-in');
        } else {
          console.error('Authentication error but user has token/username:', error);
          setValidationErrors(prev => ({
            ...prev,
            submit: 'Authentication error. Please refresh the page and try again.'
          }));
        }
      } else {
        setValidationErrors(prev => ({
          ...prev,
          submit: 'Failed to create debate. Please try again.'
        }));
      }
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
          {t('forum.backToForum')}
        </Button>

        <Card>
          <CardHeader>
            <h1 className="text-2xl font-bold">{t('forum.createDebate.title')}</h1>
            <p className="text-muted-foreground">
              {t('forum.createDebate.subtitle')}
            </p>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2 flex flex-col">
              <Label htmlFor="option1_name" className="text-lg font-semibold text-primary">
                {t('forum.createDebate.option1.name.label')}
              </Label>
              <Input
                id="option1_name"
                name="option1_name"
                value={form.option1_name}
                onChange={handleChange}
                placeholder="e.g., Lionel Messi"
                maxLength={50}
                className={`h-12 text-lg font-medium bg-background border-2 transition-all duration-200 ${
                  validationErrors.option1_name 
                     ? 'border-destructive focus-visible:ring-destructive' 
                    : 'border-primary/20 hover:border-primary/40 focus:border-primary focus:ring-2 focus:ring-primary/20'
                }`}
              />
              {validationErrors.option1_name && (
                <p className="text-sm text-red-500 font-medium">{validationErrors.option1_name}</p>
              )}
              <p className="text-xs text-muted-foreground font-medium">
                {t('forum.createDebate.option1.name.characterCount', { count: form.option1_name.length })}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="option1_description" className="text-lg font-semibold text-primary">
                {t('forum.createDebate.option1.description.label')}
              </Label>
              <Textarea
                id="option1_description"
                name="option1_description"
                value={form.option1_description}
                onChange={handleChange}
                placeholder="Describe the first option..."
                maxLength={500}
                className={`min-h-[120px] resize-none text-base bg-background border-2 transition-all duration-200 ${
                  validationErrors.option1_description 
                    ? 'border-destructive focus-visible:ring-destructive' 
                    : 'border-primary/20 hover:border-primary/40 focus:border-primary focus:ring-2 focus:ring-primary/20'
                }`}
              />
              {validationErrors.option1_description && (
                <p className="text-sm text-destructive font-medium">{validationErrors.option1_description}</p>
              )}
              <p className="text-xs text-muted-foreground font-medium">
                {t('forum.createDebate.option1.description.characterCount', { count: form.option1_description.length })}
              </p>
            </div>

            <div className="space-y-2 flex flex-col">
              <Label htmlFor="option2_name" className="text-lg font-semibold text-primary">
                {t('forum.createDebate.option2.name.label')}
              </Label>
              <Input
                id="option2_name"
                name="option2_name"
                value={form.option2_name}
                onChange={handleChange}
                placeholder="e.g., Cristiano Ronaldo"
                maxLength={50}
                className={`h-12 text-lg font-medium bg-background border-2 transition-all duration-200 ${
                  validationErrors.option2_name 
                    ? 'border-destructive focus-visible:ring-destructive' 
                    : 'border-primary/20 hover:border-primary/40 focus:border-primary focus:ring-2 focus:ring-primary/20'
                }`}
              />
              {validationErrors.option2_name && (
                <p className="text-sm text-red-500 font-medium">{validationErrors.option2_name}</p>
              )}
              <p className="text-xs text-muted-foreground font-medium">
                {t('forum.createDebate.option2.name.characterCount', { count: form.option2_name.length })}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="option2_description" className="text-lg font-semibold text-primary">
                {t('forum.createDebate.option2.description.label')}
              </Label>
              <Textarea
                id="option2_description"
                name="option2_description"
                value={form.option2_description}
                onChange={handleChange}
                placeholder="Describe the second option..."
                maxLength={500}
                className={`min-h-[120px] resize-none text-base bg-background border-2 transition-all duration-200 ${
                  validationErrors.option2_description 
                    ? 'border-destructive focus-visible:ring-destructive' 
                    : 'border-primary/20 hover:border-primary/40 focus:border-primary focus:ring-2 focus:ring-primary/20'
                }`}
              />
              {validationErrors.option2_description && (
                <p className="text-sm text-destructive font-medium">{validationErrors.option2_description}</p>
              )}
              <p className="text-xs text-muted-foreground font-medium">
                {t('forum.createDebate.option2.description.characterCount', { count: form.option2_description.length })}
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-lg font-semibold text-primary">
                {t('forum.createDebate.category.label')}
              </Label>
              <select
                id="sport"
                name="sport"
                value={form.sport}
                onChange={handleChange}
                className={`w-full h-12 text-lg font-medium bg-background border-2 rounded-md px-3 transition-all duration-200 ${
                  validationErrors.sport 
                    ? 'border-destructive focus-visible:ring-destructive' 
                    : 'border-primary/20 hover:border-primary/40 focus:border-primary focus:ring-2 focus:ring-primary/20'
                }`}
              >
                <option value="Football">{t('forum.createDebate.category.options.football')}</option>
                <option value="Basketball">{t('forum.createDebate.category.options.basketball')}</option>
                <option value="Tennis">{t('forum.createDebate.category.options.tennis')}</option>
                <option value="Soccer">{t('forum.createDebate.category.options.soccer')}</option>
                <option value="Volleyball">{t('forum.createDebate.category.options.volleyball')}</option>
                <option value="Baseball">{t('forum.createDebate.category.options.baseball')}</option>
                <option value="Hockey">{t('forum.createDebate.category.options.hockey')}</option>
              </select>
              {validationErrors.sport && (
                <p className="text-sm text-destructive font-medium">{validationErrors.sport}</p>
              )}
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
                  {t('forum.createDebate.buttons.cancel')}
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className={`w-full h-12 text-lg font-medium border-2 transition-all duration-200 ${
                    validationErrors.submit
                      ? 'border-destructive text-destructive focus-visible:ring-destructive' 
                      : 'border-primary/20 hover:border-primary/40 bg-primary text-primary-foreground focus:border-primary focus:ring-2 focus:ring-primary/20'
                  }`}
                >
                  {isSubmitting ? t('forum.createDebate.buttons.creatingDebate') : t('forum.createDebate.buttons.createDebate')}
                </Button>
                {validationErrors.submit && (
                  <p className="text-sm text-red-500 font-medium">{validationErrors.submit}</p>
                )}
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 