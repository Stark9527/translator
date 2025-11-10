import { useState } from 'react';
import { Volume2 } from 'lucide-react';
import type { Flashcard } from '@/types/flashcard';
import { Icon } from '@/components/ui/icon';
import { cn } from '@/utils/cn';

interface StudyCardProps {
  flashcard: Flashcard;
  isFlipped: boolean;
  onFlip: () => void;
}

export function StudyCard({ flashcard, isFlipped, onFlip }: StudyCardProps) {
  const [isPlaying, setIsPlaying] = useState(false);

  const handleSpeak = (text: string, lang: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (isPlaying) return;

    setIsPlaying(true);
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang;
      utterance.rate = 0.9;
      utterance.onend = () => setIsPlaying(false);
      utterance.onerror = () => setIsPlaying(false);
      window.speechSynthesis.speak(utterance);
    } catch (error) {
      console.error('Speech error:', error);
      setIsPlaying(false);
    }
  };

  return (
    <div className="perspective-1000 w-full max-w-md mx-auto">
      <div
        onClick={onFlip}
        className={cn(
          'relative w-full h-80 transition-transform duration-500 transform-style-3d cursor-pointer',
          isFlipped && 'rotate-y-180'
        )}
      >
        {/* 正面 - 单词 */}
        <div className="absolute inset-0 backface-hidden bg-card border-2 border-primary rounded-xl shadow-lg flex flex-col items-center justify-center p-8">
          <div className="text-center">
            <h2 className="text-4xl font-bold text-foreground mb-4">{flashcard.word}</h2>

            <div className="flex items-center justify-center gap-3 mb-6">
              {/* 音标 - 在发声按钮左边 */}
              {flashcard.phonetic && (
                <span className="text-lg text-purple-600 dark:text-purple-400">
                  {flashcard.phonetic}
                </span>
              )}
              {/* 发声按钮 - 常驻 */}
              <button
                onClick={(e) => handleSpeak(flashcard.word, flashcard.sourceLanguage, e)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
              >
                <Icon icon={Volume2} size="sm" className={isPlaying ? 'animate-pulse' : ''} />
                <span>朗读</span>
              </button>
            </div>
          </div>

          <div className="absolute bottom-6 text-sm text-muted-foreground">
            点击卡片或按空格键查看答案
          </div>
        </div>

        {/* 背面 - 翻译和例句 */}
        <div className="absolute inset-0 backface-hidden rotate-y-180 bg-card border-2 border-green-500 rounded-xl shadow-lg flex flex-col p-8 overflow-auto">
          <div className="flex-1">
            {/* 原文 */}
            <div className="mb-4 pb-4 border-b border-border">
              <p className="text-sm text-muted-foreground mb-1">原文</p>
              <p className="text-2xl font-medium text-foreground">{flashcard.word}</p>
            </div>

            {/* 翻译 */}
            <div className="mb-4">
              <p className="text-sm text-muted-foreground mb-1">翻译</p>
              <p className="text-xl text-foreground whitespace-pre-line">{flashcard.translation}</p>
              <button
                onClick={(e) => handleSpeak(flashcard.translation, flashcard.targetLanguage, e)}
                className="mt-2 inline-flex items-center gap-1 text-sm text-primary hover:underline"
              >
                <Icon icon={Volume2} size="xs" />
                朗读翻译
              </button>
            </div>

            {/* 例句 */}
            {flashcard.examples && flashcard.examples.length > 0 && (
              <div className="mb-4">
                <p className="text-sm text-muted-foreground mb-2">例句</p>
                <div className="space-y-2">
                  {flashcard.examples.map((example, index) => (
                    <p key={index} className="text-sm text-foreground italic pl-3 border-l-2 border-primary">
                      {example}
                    </p>
                  ))}
                </div>
              </div>
            )}

            {/* 笔记 */}
            {flashcard.notes && (
              <div className="mb-4">
                <p className="text-sm text-muted-foreground mb-1">笔记</p>
                <p className="text-sm text-foreground bg-muted p-3 rounded-md">{flashcard.notes}</p>
              </div>
            )}
          </div>

          <div className="text-sm text-muted-foreground text-center mt-4">
            根据记忆程度选择答题按钮
          </div>
        </div>
      </div>

      <style>{`
        .perspective-1000 {
          perspective: 1000px;
        }
        .transform-style-3d {
          transform-style: preserve-3d;
        }
        .backface-hidden {
          backface-visibility: hidden;
        }
        .rotate-y-180 {
          transform: rotateY(180deg);
        }
      `}</style>
    </div>
  );
}
