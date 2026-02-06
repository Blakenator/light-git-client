import React from 'react';
import { Button } from 'react-bootstrap';
import { OperationBanner } from '../RepoView.styles';
import { Icon } from '@light-git/core';

export type ActiveOperation = 'merge' | 'rebase' | 'cherry-pick' | 'revert' | null;

interface ActiveOperationBannerProps {
  operation: ActiveOperation;
  onAbort: () => void;
  onContinue: () => void;
}

const operationConfig = {
  merge: {
    name: 'Merge',
    icon: 'merge_type',
    isFa: false,
    variant: 'warning' as const,
  },
  rebase: {
    name: 'Rebase',
    icon: 'fa-code-branch',
    isFa: true,
    variant: 'info' as const,
  },
  'cherry-pick': {
    name: 'Cherry Pick',
    icon: 'fa-apple-alt',
    isFa: true,
    variant: 'info' as const,
  },
  revert: {
    name: 'Revert',
    icon: 'fa-undo',
    isFa: true,
    variant: 'danger' as const,
  },
};

export const ActiveOperationBanner: React.FC<ActiveOperationBannerProps> = React.memo(({
  operation,
  onAbort,
  onContinue,
}) => {
  if (!operation) return null;

  const config = operationConfig[operation];

  return (
    <OperationBanner variant={config.variant}>
      <Icon name={config.icon} />
      <span>Active {config.name}</span>
      <span className="flex-grow-1" />
      <Button
        variant="outline-light"
        size="sm"
        onClick={onAbort}
        title={`Abort the ${config.name}`}
      >
        <Icon name="fa-undo" />
      </Button>
      <Button
        variant="outline-light"
        size="sm"
        onClick={onContinue}
        title={`Continue the ${config.name}`}
        className="ms-1"
      >
        <Icon name="fa-play" />
      </Button>
    </OperationBanner>
  );
});

ActiveOperationBanner.displayName = 'ActiveOperationBanner';

export default ActiveOperationBanner;
