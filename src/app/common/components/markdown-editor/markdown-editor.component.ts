import {
  Component,
  forwardRef,
  Input,
  OnDestroy,
  OnInit,
  AfterViewInit,
  EventEmitter,
  Output,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import * as Showdown from 'showdown';
import { QuillModules } from 'ngx-quill';
import QuillMarkdown from 'quilljs-markdown';

@Component({
  selector: 'app-markdown-editor',
  standalone: false,
  templateUrl: './markdown-editor.component.html',
  styleUrls: ['./markdown-editor.component.scss'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => MarkdownEditorComponent),
      multi: true,
    },
  ],
})
export class MarkdownEditorComponent
  implements OnInit, OnDestroy, AfterViewInit, ControlValueAccessor
{
  @Input() placeholder = 'Enter markdown text...';
  @Output() onBlur = new EventEmitter<void>();
  @Output() onSubmit = new EventEmitter<void>();
  @Output() onUpdateSelection = new EventEmitter<KeyboardEvent | Event>();

  quillModules: QuillModules;
  editorContent: string = '';
  private content: string = '';
  private destroy$ = new Subject<void>();
  private onChange: (value: string) => void = () => {};
  private onTouched: () => void = () => {};
  private quillMarkdown: QuillMarkdown;
  private markdownConverter: Showdown.Converter;

  constructor() {
    // Set flavor to GitHub to handle lists and other formatting consistently
    this.markdownConverter = new Showdown.Converter({
      tables: true,
      simplifiedAutoLink: true,
      strikethrough: true,
      tasklists: true,
      disableForced4SpacesIndentedSublists: true,
      literalMidWordUnderscores: true,
      simpleLineBreaks: true,
      openLinksInNewWindow: true,
      backslashEscapesHTMLTags: true,
      underline: true,
      ghMentions: false,
    });
    this.markdownConverter.setFlavor('github');
  }

  ngOnInit(): void {
    this.configureQuillModules();
  }

  ngAfterViewInit(): void {
    // We'll initialize quilljs-markdown in the onEditorCreated method instead
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private configureQuillModules(): void {
    this.quillModules = {
      toolbar: false,
      syntax: false, // Disable syntax highlighting bc highlight is required somehow
      clipboard: {
        matchVisual: true,
      },
    };
  }

  // Handle editor content changes
  onEditorContentChanged(event: any): void {
    const html = event.html || '';

    this.content = this.markdownConverter
      .makeMarkdown(html)
      // strip md comments
      .replace(/<!--.*?-->\n?\n?/g, '');
    this.onChange(this.content);
  }

  // Handler for Quill editor creation
  onEditorCreated(editor: any): void {
    // Initialize quilljs-markdown with the editor instance
    this.quillMarkdown = new QuillMarkdown(editor, {});
  }

  // Handle editor blur event
  onEditorBlurred(): void {
    this.onTouched();
    this.onBlur.emit();
  }

  // Update editor content
  private updateEditorContent(markdown: string): void {
    // Update the editor content directly
    this.editorContent = markdown || '';
  }

  // ControlValueAccessor methods
  writeValue(value: string): void {
    this.content = value || '';
    this.updateEditorContent(this.content);
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    // ngx-quill handles this automatically through property binding
  }
}
