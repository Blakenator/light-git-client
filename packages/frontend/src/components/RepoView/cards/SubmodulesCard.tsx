import React, { useState, useMemo } from 'react';
import { Button, ButtonGroup, Badge } from 'react-bootstrap';
import { LayoutCard } from '../../LayoutCard/LayoutCard';
import { Icon } from '@light-git/core';
import { CardHeaderContent, CardFilterInput, CardHeaderButtons } from '../RepoView.styles';
import type { SubmoduleModel } from '@light-git/shared';

interface SubmodulesCardProps {
  submodules: SubmoduleModel[];
  onAddSubmodule: () => void;
  onUpdateSubmodules: (recursive: boolean) => void;
  onOpenNewTab: (submodule: SubmoduleModel) => void;
  onViewSubmodule: (submodule: SubmoduleModel) => void;
}

export const SubmodulesCard: React.FC<SubmodulesCardProps> = React.memo(({
  submodules,
  onAddSubmodule,
  onUpdateSubmodules,
  onOpenNewTab,
  onViewSubmodule,
}) => {
  const [filter, setFilter] = useState('');

  const filteredSubmodules = useMemo(() => {
    if (!filter) return submodules;
    const lowerFilter = filter.toLowerCase();
    return submodules.filter((s) => s.path?.toLowerCase().includes(lowerFilter));
  }, [submodules, filter]);

  const headerContent = (
    <CardHeaderContent>
      <CardFilterInput
        placeholder="Filter..."
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        onClick={(e) => e.stopPropagation()}
      />
      <CardHeaderButtons>
        <Button
          variant="primary"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onAddSubmodule();
          }}
          title="Add Submodule"
        >
          <Icon name="fa-plus" />
        </Button>
        <ButtonGroup size="sm">
          <Button
            variant="primary"
            onClick={(e) => {
              e.stopPropagation();
              onUpdateSubmodules(true);
            }}
            title="Update Submodules Recursively"
          >
            <Icon name="fa-sitemap" />
          </Button>
        </ButtonGroup>
      </CardHeaderButtons>
    </CardHeaderContent>
  );

  return (
    <LayoutCard
      title="Submodules"
      iconClass="fa fa-plug"
      expandKey="submodules"
      headerContent={headerContent}
    >
      <div className="card-body">
        {filteredSubmodules.map((submodule) => (
          <SubmoduleItem
            key={submodule.path}
            submodule={submodule}
            onOpenNewTab={onOpenNewTab}
            onViewSubmodule={onViewSubmodule}
          />
        ))}
        {filteredSubmodules.length === 0 && (
          <div className="text-muted text-center py-2">No submodules found</div>
        )}
      </div>
    </LayoutCard>
  );
});

interface SubmoduleItemProps {
  submodule: SubmoduleModel;
  onOpenNewTab: (submodule: SubmoduleModel) => void;
  onViewSubmodule: (submodule: SubmoduleModel) => void;
}

const SubmoduleItem: React.FC<SubmoduleItemProps> = ({
  submodule,
  onOpenNewTab,
  onViewSubmodule,
}) => {
  const pathParts = submodule.path?.split('/') || [];

  return (
    <div className="d-flex align-items-center py-1">
      <span className="flex-grow-1" title={submodule.path}>
        {pathParts.map((part, index) => (
          <React.Fragment key={index}>
            <Badge bg="light" text="dark" pill>
              {part}
              {index < pathParts.length - 1 && (
                <Icon name="fa-arrow-right" size="sm" className="mx-1" />
              )}
            </Badge>
          </React.Fragment>
        ))}
      </span>
      <ButtonGroup size="sm">
        <Button
          variant="primary"
          size="sm"
          onClick={() => onOpenNewTab(submodule)}
          title="Open in new tab"
        >
          <Icon name="fa-external-link-square-alt" size="sm" />
        </Button>
        <Button
          variant="warning"
          size="sm"
          onClick={() => onViewSubmodule(submodule)}
          title="Quick view"
        >
          <Icon name="fa-eye" size="sm" />
        </Button>
      </ButtonGroup>
    </div>
  );
};

SubmodulesCard.displayName = 'SubmodulesCard';

export default SubmodulesCard;
