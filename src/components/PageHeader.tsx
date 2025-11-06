import { Settings } from 'lucide-react';
import { Icon } from './ui/icon';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  showSettings?: boolean;
}

export function PageHeader({ title, subtitle, showSettings = true }: PageHeaderProps) {
  const handleOpenSettings = () => {
    chrome.runtime.openOptionsPage();
  };

  return (
    <TooltipProvider>
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">{title}</h1>
          {subtitle && (
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          )}
        </div>
        {showSettings && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={handleOpenSettings}
                className="p-2 hover:bg-accent rounded-md transition-colors"
                aria-label="打开设置"
              >
                <Icon icon={Settings} size="sm" className="text-muted-foreground hover:text-foreground" />
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <p>设置</p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  );
}
