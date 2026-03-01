import React, {
  useCallback,
  useEffect,
  useRef,
  useMemo,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import styled from 'styled-components';

// Lexical core
import {
  TextNode,
  KEY_ENTER_COMMAND,
  COMMAND_PRIORITY_HIGH,
  type EditorState,
} from 'lexical';

// Lexical React plugins
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import { MarkdownShortcutPlugin } from '@lexical/react/LexicalMarkdownShortcutPlugin';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
  LexicalTypeaheadMenuPlugin,
  MenuOption,
} from '@lexical/react/LexicalTypeaheadMenuPlugin';
import { ListPlugin } from '@lexical/react/LexicalListPlugin';

// Markdown
import {
  $convertFromMarkdownString,
  $convertToMarkdownString,
  TRANSFORMERS,
} from '@lexical/markdown';

// Nodes
import { HeadingNode, QuoteNode } from '@lexical/rich-text';
import { ListNode, ListItemNode } from '@lexical/list';
import { LinkNode } from '@lexical/link';
import { CodeNode } from '@lexical/code';

// ---- Styled Components ----

const EditorContainer = styled.div`
  position: relative;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius};
  background-color: ${({ theme }) => theme.colors.background};

  &:focus-within {
    border-color: ${({ theme }) => theme.colors.primary};
    box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25);
  }
`;

const EditorInner = styled.div`
  position: relative;
`;

const StyledContentEditable = styled(ContentEditable)`
  width: 100%;
  min-height: 80px;
  max-height: 200px;
  padding: 0.75rem;
  border: none;
  outline: none;
  overflow-y: auto;
  font-family: inherit;
  font-size: 0.875rem;
  line-height: 1.5;
  background-color: transparent;
  color: ${({ theme }) => theme.colors.text};

  /* Lexical theme class styles */
  .editor-paragraph {
    margin: 0;
  }

  .editor-heading-h1 {
    font-size: 1.5em;
    font-weight: bold;
    margin: 0;
  }

  .editor-heading-h2 {
    font-size: 1.3em;
    font-weight: bold;
    margin: 0;
  }

  .editor-heading-h3 {
    font-size: 1.1em;
    font-weight: bold;
    margin: 0;
  }

  .editor-text-bold {
    font-weight: bold;
  }

  .editor-text-italic {
    font-style: italic;
  }

  .editor-text-code {
    background-color: rgba(150, 150, 150, 0.15);
    padding: 1px 4px;
    border-radius: 3px;
    font-family: ${({ theme }) => theme.fonts.monospace};
    font-size: 0.9em;
  }

  .editor-text-strikethrough {
    text-decoration: line-through;
  }

  .editor-text-underline {
    text-decoration: underline;
  }

  .editor-quote {
    border-left: 3px solid ${({ theme }) => theme.colors.border};
    padding-left: 0.75rem;
    margin: 0.25rem 0;
    color: ${({ theme }) => theme.colors.secondary};
  }

  .editor-list-ul,
  .editor-list-ol {
    margin: 0;
    padding-left: 1.5rem;
  }

  .editor-list-item {
    margin: 0;
  }

  .editor-link {
    color: ${({ theme }) => theme.colors.primary};
    text-decoration: underline;
  }

  .editor-code {
    background-color: rgba(150, 150, 150, 0.1);
    padding: 0.5rem;
    border-radius: 4px;
    font-family: ${({ theme }) => theme.fonts.monospace};
    font-size: 0.9em;
    display: block;
    margin: 0.25rem 0;
    tab-size: 2;
    overflow-x: auto;
  }
`;

const EditorPlaceholder = styled.div`
  position: absolute;
  top: 0.75rem;
  left: 0.75rem;
  color: ${({ theme }) => theme.colors.secondary};
  opacity: 0.6;
  pointer-events: none;
  user-select: none;
  font-size: 0.875rem;
`;

const AutocompleteDropdown = styled.div`
  position: absolute;
  bottom: calc(100% + 1.5rem);
  left: 0;
  min-width: 200px;
  background-color: ${({ theme }) => theme.colors.background};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius};
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
  max-height: 200px;
  overflow-y: auto;
`;

const AutocompleteItem = styled.div<{ $active?: boolean }>`
  padding: 0.375rem 0.75rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background-color: ${({ $active, theme }) =>
    $active ? theme.colors.primary : 'transparent'};
  color: ${({ $active }) => ($active ? 'white' : 'inherit')};

  &:hover {
    background-color: ${({ $active, theme }) =>
      $active ? theme.colors.primary : theme.colors.light};
  }
`;

const SuggestionIconWrapper = styled.span`
  width: 1rem;
  text-align: center;
  flex-shrink: 0;
  opacity: 0.7;
  font-size: 0.75rem;
`;

const SuggestionLabel = styled.span`
  flex: 1;
  min-width: 0;
`;

const SuggestionValue = styled.span`
  opacity: 0.6;
  font-size: 0.75rem;
  margin-left: 0.25rem;
`;

const NoMatchesItem = styled.div`
  padding: 0.5rem 1rem;
  color: ${({ theme }) => theme.colors.secondary};
  font-style: italic;
  font-size: 0.875rem;
`;

// ---- Lexical Configuration ----

const lexicalTheme = {
  paragraph: 'editor-paragraph',
  heading: {
    h1: 'editor-heading-h1',
    h2: 'editor-heading-h2',
    h3: 'editor-heading-h3',
    h4: 'editor-heading-h3',
    h5: 'editor-heading-h3',
    h6: 'editor-heading-h3',
  },
  text: {
    bold: 'editor-text-bold',
    italic: 'editor-text-italic',
    code: 'editor-text-code',
    strikethrough: 'editor-text-strikethrough',
    underline: 'editor-text-underline',
  },
  list: {
    ul: 'editor-list-ul',
    ol: 'editor-list-ol',
    listitem: 'editor-list-item',
  },
  quote: 'editor-quote',
  code: 'editor-code',
  link: 'editor-link',
};

const EDITOR_NODES = [
  HeadingNode,
  QuoteNode,
  ListNode,
  ListItemNode,
  LinkNode,
  CodeNode,
];

// ---- Suggestion Option ----

class SuggestionOption extends MenuOption {
  label: string;
  source: string;
  type: 'file' | 'branch' | 'phrase';

  constructor(label: string, source: string = 'file', type: 'file' | 'branch' | 'phrase' = 'file') {
    super(label);
    this.label = label;
    this.source = source;
    this.type = type;
  }
}

// ---- Custom Plugins ----

/**
 * Syncs the external `value` prop into the Lexical editor when it changes
 * from outside (e.g., clearing the message after a commit).
 */
function ExternalValueSyncPlugin({
  value,
  lastEmittedValueRef,
}: {
  value: string;
  lastEmittedValueRef: React.MutableRefObject<string>;
}) {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    if (value !== lastEmittedValueRef.current) {
      lastEmittedValueRef.current = value;
      editor.update(() => {
        $convertFromMarkdownString(value, TRANSFORMERS);
      });
    }
  }, [value, editor, lastEmittedValueRef]);

  return null;
}

/**
 * Handles Ctrl/Cmd+Enter to trigger commit submission.
 */
function SubmitPlugin({ onSubmit }: { onSubmit?: () => void }) {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    if (!onSubmit) return;

    return editor.registerCommand(
      KEY_ENTER_COMMAND,
      (event: KeyboardEvent | null) => {
        if (event && (event.ctrlKey || event.metaKey)) {
          event.preventDefault();
          onSubmit();
          return true;
        }
        return false;
      },
      COMMAND_PRIORITY_HIGH,
    );
  }, [editor, onSubmit]);

  return null;
}

/**
 * Syncs the `disabled` prop to Lexical's editable state.
 */
function EditablePlugin({ disabled }: { disabled: boolean }) {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    editor.setEditable(!disabled);
  }, [editor, disabled]);

  return null;
}

/**
 * Provides typeahead autocomplete from file/branch name suggestions.
 * Triggered by typing `@` followed by at least 1 character.
 * On selection the `@` prefix is stripped and only the suggestion is inserted.
 * The dropdown is portaled into the anchor element that the plugin positions
 * at the cursor location.
 */
export interface Suggestion {
  label: string;
  source: string;
  type: 'file' | 'branch' | 'phrase';
}

const SUGGESTION_ICONS: Record<string, string> = {
  file: 'description',
  branch: 'account_tree',
  phrase: 'bolt',
};

function SuggestionTypeIcon({ type }: { type: string }) {
  const name = SUGGESTION_ICONS[type] || SUGGESTION_ICONS.file;
  return (
    <SuggestionIconWrapper className="material-icons">
      {name}
    </SuggestionIconWrapper>
  );
}

const TRIGGER_REGEX = /(^|\s|\()(@([^\s@]{1,75}))$/;

function AutocompletePlugin({ suggestions }: { suggestions: Suggestion[] }) {
  const [queryString, setQueryString] = useState<string | null>(null);

  const triggerFn = useCallback(
    (text: string) => {
      const match = TRIGGER_REGEX.exec(text);
      if (match !== null && match[3].length >= 1) {
        return {
          leadOffset: match.index + match[1].length,
          matchingString: match[3],
          replaceableString: match[2],
        };
      }
      return null;
    },
    [],
  );

  const filteredOptions = useMemo(() => {
    if (!queryString || !suggestions.length) return [];

    const lowerQuery = queryString.toLowerCase();
    return suggestions
      .filter((s) => s.label.toLowerCase().includes(lowerQuery))
      .slice(0, 8)
      .map((s) => new SuggestionOption(s.label, s.source, s.type));
  }, [queryString, suggestions]);

  const onSelectOption = useCallback(
    (
      option: SuggestionOption,
      textNodeContainingQuery: TextNode | null,
      closeMenu: () => void,
    ) => {
      if (textNodeContainingQuery) {
        const insertText = option.type === 'phrase' ? option.source : option.label;
        textNodeContainingQuery.setTextContent(insertText + ' ');
        textNodeContainingQuery.select();
      }
      closeMenu();
    },
    [],
  );

  return (
    <LexicalTypeaheadMenuPlugin<SuggestionOption>
      options={filteredOptions}
      onQueryChange={setQueryString}
      triggerFn={triggerFn}
      onSelectOption={onSelectOption}
      menuRenderFn={(
        anchorElementRef,
        { selectedIndex, selectOptionAndCleanUp, setHighlightedIndex, options },
      ) => {
        if (!anchorElementRef.current) return null;

        return createPortal(
          <AutocompleteDropdown>
            {options.length === 0 ? (
              <NoMatchesItem>No matches</NoMatchesItem>
            ) : (
              options.map((option, index) => (
                <AutocompleteItem
                  key={option.key}
                  $active={selectedIndex === index}
                  ref={(el) => option.setRefElement(el)}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    selectOptionAndCleanUp(option);
                  }}
                  onMouseEnter={() => setHighlightedIndex(index)}
                >
                  <SuggestionTypeIcon type={option.type} />
                  <SuggestionLabel>
                    {option.label}
                    {option.type === 'phrase' && option.source && (
                      <SuggestionValue>({option.source})</SuggestionValue>
                    )}
                  </SuggestionLabel>
                </AutocompleteItem>
              ))
            )}
          </AutocompleteDropdown>,
          anchorElementRef.current,
        );
      }}
    />
  );
}

// ---- Props ----

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  onSubmit?: () => void;
  placeholder?: string;
  disabled?: boolean;
  suggestions?: Suggestion[];
}

// ---- Main Component ----

export const MarkdownEditor: React.FC<MarkdownEditorProps> = ({
  value,
  onChange,
  onBlur,
  onSubmit,
  placeholder = 'Enter text...',
  disabled = false,
  suggestions: externalSuggestions = [],
}) => {
  const lastEmittedValueRef = useRef(value);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Handle editor state changes: convert Lexical nodes back to markdown string
  const handleChange = useCallback(
    (editorState: EditorState) => {
      editorState.read(() => {
        const markdown = $convertToMarkdownString(TRANSFORMERS);
        lastEmittedValueRef.current = markdown;
        onChange(markdown);
      });
    },
    [onChange],
  );

  // Handle blur on the container, ignoring internal focus moves
  const handleContainerBlur = useCallback(
    (e: React.FocusEvent<HTMLDivElement>) => {
      if (e.currentTarget.contains(e.relatedTarget as Node)) {
        return;
      }
      // Delay slightly to allow autocomplete clicks to register
      setTimeout(() => {
        onBlur?.();
      }, 150);
    },
    [onBlur],
  );

  // Initial config - only computed once
  const initialConfig = useMemo(
    () => ({
      namespace: 'CommitMessageEditor',
      nodes: EDITOR_NODES,
      theme: lexicalTheme,
      editable: !disabled,
      editorState: () => {
        $convertFromMarkdownString(value, TRANSFORMERS);
      },
      onError: (error: Error) => {
        console.error('Lexical editor error:', error);
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [], // Intentionally empty: initialConfig is only used once at mount
  );

  return (
    <EditorContainer ref={containerRef} onBlur={handleContainerBlur}>
      <LexicalComposer initialConfig={initialConfig}>
        <EditorInner>
          <RichTextPlugin
            contentEditable={<StyledContentEditable />}
            placeholder={<EditorPlaceholder>{placeholder}</EditorPlaceholder>}
            ErrorBoundary={LexicalErrorBoundary}
          />
        </EditorInner>
        <MarkdownShortcutPlugin transformers={TRANSFORMERS} />
        <HistoryPlugin />
        <ListPlugin />
        <OnChangePlugin onChange={handleChange} ignoreSelectionChange />
        <ExternalValueSyncPlugin
          value={value}
          lastEmittedValueRef={lastEmittedValueRef}
        />
        <SubmitPlugin onSubmit={onSubmit} />
        <EditablePlugin disabled={disabled} />
        <AutocompletePlugin suggestions={externalSuggestions} />
      </LexicalComposer>
    </EditorContainer>
  );
};

export default MarkdownEditor;
