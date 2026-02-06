import React, { useState, useEffect, useCallback } from 'react';
import { Modal as BsModal, Button, Form, InputGroup } from 'react-bootstrap';

interface InputModalProps {
  show: boolean;
  onHide: () => void;
  title: string;
  message?: string;
  placeholder?: string;
  defaultValue?: string;
  validPattern?: string;
  invalidMessage?: string;
  inputPrepend?: string;
  showPrependClearButton?: boolean;
  replaceChars?: { [key: string]: string };
  onOk: (value: string) => void;
  onCancel?: () => void;
  onPrependClear?: () => void;
}

export const InputModal: React.FC<InputModalProps> = ({
  show,
  onHide,
  title,
  message,
  placeholder = '',
  defaultValue = '',
  validPattern,
  invalidMessage = 'Invalid input',
  inputPrepend,
  showPrependClearButton = false,
  replaceChars = {},
  onOk,
  onCancel,
  onPrependClear,
}) => {
  const [value, setValue] = useState(defaultValue);
  const [isValid, setIsValid] = useState(true);
  const [touched, setTouched] = useState(false);

  // Reset when modal opens
  useEffect(() => {
    if (show) {
      setValue(defaultValue);
      setIsValid(true);
      setTouched(false);
    }
  }, [show, defaultValue]);

  const validateInput = useCallback((input: string) => {
    if (!validPattern) return true;
    const regex = new RegExp(`^${validPattern}$`);
    return regex.test(input);
  }, [validPattern]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let newValue = e.target.value;
    
    // Apply character replacements
    Object.entries(replaceChars).forEach(([from, to]) => {
      newValue = newValue.replace(new RegExp(from, 'g'), to);
    });
    
    setValue(newValue);
    setTouched(true);
    setIsValid(validateInput(newValue));
  };

  const handleClose = () => {
    onHide();
    onCancel?.();
  };

  const handleSubmit = () => {
    if (isValid && value.trim()) {
      const fullValue = inputPrepend ? inputPrepend + value : value;
      onOk(fullValue);
      onHide();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && isValid && value.trim()) {
      handleSubmit();
    }
  };

  return (
    <BsModal show={show} onHide={handleClose} centered>
      <BsModal.Header closeButton>
        <BsModal.Title>{title}</BsModal.Title>
      </BsModal.Header>
      <BsModal.Body>
        {message && <p>{message}</p>}
        <Form.Group>
          <InputGroup>
            {inputPrepend && (
              <InputGroup.Text>
                {inputPrepend}
                {showPrependClearButton && (
                  <Button
                    variant="link"
                    size="sm"
                    className="p-0 ms-1"
                    onClick={onPrependClear}
                  >
                    ×
                  </Button>
                )}
              </InputGroup.Text>
            )}
            <Form.Control
              type="text"
              value={value}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              isInvalid={touched && !isValid}
              autoFocus
            />
            <Form.Control.Feedback type="invalid">
              {invalidMessage}
            </Form.Control.Feedback>
          </InputGroup>
        </Form.Group>
      </BsModal.Body>
      <BsModal.Footer>
        <Button variant="secondary" onClick={handleClose}>
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={handleSubmit}
          disabled={!isValid || !value.trim()}
        >
          OK
        </Button>
      </BsModal.Footer>
    </BsModal>
  );
};

export default InputModal;
