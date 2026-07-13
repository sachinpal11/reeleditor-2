import React from 'react';
import { HeadlineResponse } from '../../../../shared/types';

interface HeadlineRendererProps {
  headline?: HeadlineResponse;
  brandColor?: string;
}

export const HeadlineRenderer: React.FC<HeadlineRendererProps> = ({
  headline,
  brandColor = '#6366f1',
}) => {
  if (!headline || !headline.lines || headline.lines.length === 0) {
    return <span className="text-zinc-500 italic">No headline generated yet.</span>;
  }

  return (
    <div className="flex flex-col gap-2 font-display tracking-wide select-text leading-relaxed">
      {headline.lines.map((line, lineIdx) => (
        <div key={lineIdx} className="flex flex-wrap gap-x-1.5 gap-y-1 items-center">
          {line.map((segment, segIdx) => {
            const isRegular = segment.style === 'Regular';
            const isBold = segment.style === 'Bold';
            const isBrand = segment.style === 'Brand';

            return (
              <span
                key={segIdx}
                style={{
                  fontWeight: isRegular ? 400 : 700,
                  color: isBrand ? brandColor : undefined,
                }}
                className={
                  isRegular
                    ? 'text-zinc-400 font-normal'
                    : isBold
                    ? 'text-zinc-100 font-bold'
                    : 'font-bold'
                }
              >
                {segment.text}
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
};
