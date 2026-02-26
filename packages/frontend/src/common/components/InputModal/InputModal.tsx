import React, { useState, useEffect, useCallback } from 'react';
import { Modal as BsModal, Button, Form, InputGroup } from 'react-bootstrap';
import { useUiStore } from '../../../stores';

interface InputModalProps {
  modalId: string;
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
  /** @deprecated No longer needed – the modal handles temporary prefix clearing internally. */
  onPrependClear?: () => void;
}

export const InputModal: React.FC<InputModalProps> = ({
  modalId,
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
  // onPrependClear is accepted for backward compat but no longer used;
  // the modal handles temporary prefix clearing internally.
}) => {
  const isVisible = useUiStore((state) => state.modals[modalId] || false);
  const hideModal = useUiStore((state) => state.hideModal);
  
  const [value, setValue] = useState(defaultValue);
  const [isValid, setIsValid] = useState(true);
  const [touched, setTouched] = useState(false);
  const [prependCleared, setPrependCleared] = useState(false);

  // Reset when modal opens
  useEffect(() => {
    if (isVisible) {
      setValue(defaultValue);
      setIsValid(true);
      setTouched(false);
      setPrependCleared(false);
    }
  }, [isVisible, defaultValue]);

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
    hideModal(modalId);
    onCancel?.();
  };

  const handleSubmit = () => {
    if (isValid && value.trim()) {
      const activePrepend = prependCleared ? '' : inputPrepend;
      const fullValue = activePrepend ? activePrepend + value : value;
      onOk(fullValue);
      hideModal(modalId);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && isValid && value.trim()) {
      handleSubmit();
    }
  };

  return (
    <BsModal show={isVisible} onHide={handleClose} centered>
      <BsModal.Header closeButton>
        <BsModal.Title>{title}</BsModal.Title>
      </BsModal.Header>
      <BsModal.Body>
        {message && <p>{message}</p>}
        <Form.Group>
          <InputGroup>
            {inputPrepend && !prependCleared && (
              <InputGroup.Text>
                {inputPrepend}
                {showPrependClearButton && (
                  <Button
                    variant="link"
                    size="sm"
                    className="p-0 ms-1"
                    onClick={() => setPrependCleared(true)}
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
