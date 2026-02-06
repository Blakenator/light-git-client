import React, { useCallback, useEffect, useState, useRef, useMemo } from 'react';
import styled from 'styled-components';

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

const EditorTextarea = styled.textarea`
  width: 100%;
  min-height: 80px;
  max-height: 200px;
  padding: 0.75rem;
  border: none;
  outline: none;
  resize: vertical;
  font-family: inherit;
  font-size: 0.875rem;
  line-height: 1.5;
  background-color: transparent;
  color: ${({ theme }) => theme.colors.text};
  
  &::placeholder {
    color: ${({ theme }) => theme.colors.secondary};
    opacity: 0.6;
  }
  
  &:disabled {
    background-color: ${({ theme }) => theme.colors.light};
    cursor: not-allowed;
  }
`;

const AutocompleteDropdown = styled.div`
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background-color: ${({ theme }) => theme.colors.background};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius};
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
  z-index: 100;
  max-height: 200px;
  overflow-y: auto;
`;

const AutocompleteItem = styled.div<{ $active?: boolean }>`
  padding: 0.5rem 1rem;
  cursor: pointer;
  background-color: ${({ $active, theme }) =>
    $active ? theme.colors.primary : 'transparent'};
  color: ${({ $active }) => ($active ? 'white' : 'inherit')};

  &:hover {
    background-color: ${({ $active, theme }) =>
      $active ? theme.colors.primary : theme.colors.light};
  }
`;

const SuggestionSource = styled.span`
  opacity: 0.6;
  font-size: 0.75rem;
  margin-left: 0.5rem;
`;

interface AutocompleteSuggestion {
  text: string;
  source: 'file' | 'branch' | 'history';
}

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  onSubmit?: () => void;
  placeholder?: string;
  disabled?: boolean;
  suggestions?: string[];
}

export const MarkdownEditor: React.FC<MarkdownEditorProps> = ({
  value,
  onChange,
  onBlur,
  onSubmit,
  placeholder = 'Enter text...',
  disabled = false,
  suggestions: externalSuggestions = [],
}) => {
  const [suggestions, setSuggestions] = useState<AutocompleteSuggestion[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [currentWord, setCurrentWord] = useState('');
  const [cursorPosition, setCursorPosition] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Filter suggestions based on current word
  const updateSuggestions = useCallback((text: string, position: number) => {
    // Find the current word being typed
    const beforeCursor = text.substring(0, position);
    const words = beforeCursor.split(/[\s,]/);
    const word = words[words.length - 1] || '';
    
    setCurrentWord(word);
    setCursorPosition(position);

    if (word.length < 2) {
      setSuggestions([]);
      return;
    }

    // Filter suggestions
    const lowerWord = word.toLowerCase();
    const filtered = externalSuggestions
      .filter((s) => s.toLowerCase().includes(lowerWord) && s.toLowerCase() !== lowerWord)
      .slice(0, 8)
      .map((text) => ({ text, source: 'file' as const }));

    setSuggestions(filtered);
    setSelectedIndex(0);
  }, [externalSuggestions]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    const position = e.target.selectionStart || 0;
    onChange(newValue);
    updateSuggestions(newValue, position);
  }, [onChange, updateSuggestions]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Ctrl/Cmd+Enter to submit
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      onSubmit?.();
      return;
    }

    // Handle autocomplete navigation
    if (suggestions.length > 0) {
      if (e.key === 'Tab') {
        e.preventDefault();
        if (suggestions[selectedIndex]) {
          selectSuggestion(suggestions[selectedIndex]);
        }
        return;
      }
      
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(suggestions.length - 1, prev + 1));
        return;
      }
      
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(0, prev - 1));
        return;
      }
      
      if (e.key === 'Escape') {
        e.preventDefault();
        setSuggestions([]);
        return;
      }
      
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (suggestions[selectedIndex]) {
          selectSuggestion(suggestions[selectedIndex]);
        }
        return;
      }
    }
  }, [suggestions, selectedIndex, onSubmit]);

  const selectSuggestion = useCallback((suggestion: AutocompleteSuggestion) => {
    if (!textareaRef.current) return;
    
    const textarea = textareaRef.current;
    const text = value;
    
    // Find the start of the current word
    const beforeCursor = text.substring(0, cursorPosition);
    const lastSpaceIndex = Math.max(
      beforeCursor.lastIndexOf(' '),
      beforeCursor.lastIndexOf(','),
      beforeCursor.lastIndexOf('\n')
    );
    const wordStart = lastSpaceIndex + 1;
    
    // Replace the current word with the suggestion
    const newValue = 
      text.substring(0, wordStart) + 
      suggestion.text + 
      text.substring(cursorPosition);
    
    onChange(newValue);
    setSuggestions([]);
    setSelectedIndex(0);
    
    // Set cursor position after the inserted text
    const newPosition = wordStart + suggestion.text.length;
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(newPosition, newPosition);
    }, 0);
  }, [value, cursorPosition, onChange]);

  const handleBlur = useCallback((e: React.FocusEvent) => {
    // Check if the new focus target is within the container (e.g., clicking on suggestions)
    const relatedTarget = e.relatedTarget as Node | null;
    if (containerRef.current?.contains(relatedTarget)) {
      return;
    }
    
    // Delay to allow clicking on suggestions
    setTimeout(() => {
      setSuggestions([]);
      onBlur?.();
    }, 150);
  }, [onBlur]);

  const handleClick = useCallback((e: React.MouseEvent<HTMLTextAreaElement>) => {
    const textarea = e.currentTarget;
    updateSuggestions(textarea.value, textarea.selectionStart || 0);
  }, [updateSuggestions]);

  return (
    <EditorContainer ref={containerRef}>
      <EditorTextarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        onClick={handleClick}
        placeholder={placeholder}
        disabled={disabled}
      />

      {suggestions.length > 0 && (
        <AutocompleteDropdown>
          {suggestions.map((suggestion, index) => (
            <AutocompleteItem
              key={suggestion.text}
              $active={index === selectedIndex}
              onMouseDown={(e) => {
                e.preventDefault(); // Prevent blur
                selectSuggestion(suggestion);
              }}
              onMouseEnter={() => setSelectedIndex(index)}
            >
              {suggestion.text}
              <SuggestionSource>({suggestion.source})</SuggestionSource>
            </AutocompleteItem>
          ))}
        </AutocompleteDropdown>
      )}
    </EditorContainer>
  );
};

export default MarkdownEditor;
