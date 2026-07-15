import { cn } from '../../helpers/cn';

interface VariablesPanelProps {
  props: Record<string, unknown>;
}

type Formatted = {
  kind: 'string' | 'number' | 'boolean' | 'special' | 'json' | 'empty';
  text: string;
};

function formatValue(value: unknown): Formatted {
  if (value === null || value === undefined) return { kind: 'empty', text: '—' };
  if (typeof value === 'string') {
    // The CLI serializer replaces non-serializable props with tags like
    // "[ReactElement]" / "[Function]" — surface those as pills, not raw text.
    if (/^\[[A-Za-z]+\]$/.test(value)) return { kind: 'special', text: value.slice(1, -1) };
    return { kind: 'string', text: value };
  }
  if (typeof value === 'number') return { kind: 'number', text: String(value) };
  if (typeof value === 'boolean') return { kind: 'boolean', text: String(value) };
  return { kind: 'json', text: JSON.stringify(value, null, 2) };
}

export function VariablesPanel({ props }: VariablesPanelProps) {
  const entries = Object.entries(props ?? {});

  if (entries.length === 0) {
    return <p className="tool-note">No variables for this sample.</p>;
  }

  return (
    <div className="variables-list">
      {entries.map(([key, value]) => {
        const { kind, text } = formatValue(value);
        return (
          <div className="variable-row" key={key}>
            <span className="variable-key">{key}</span>
            {kind === 'json' ? (
              <pre className="variable-json">{text}</pre>
            ) : (
              <span className={cn('variable-value', `is-${kind}`)}>{text}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
