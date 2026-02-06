import React from 'react';
import { FontAwesomeIcon, FontAwesomeIconProps } from '@fortawesome/react-fontawesome';
import { IconName } from '@fortawesome/fontawesome-svg-core';
import styled from 'styled-components';

// ==================== Material Icons ====================

interface MaterialIconProps {
  name: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  onClick?: () => void;
}

const MaterialIconWrapper = styled.span<{ size?: string }>`
  font-size: ${({ size }) => {
    switch (size) {
      case 'sm': return '0.875rem';
      case 'lg': return '1.5rem';
      case 'xl': return '2rem';
      default: return '1.2rem';
    }
  }};
  vertical-align: middle;
  cursor: ${({ onClick }) => (onClick ? 'pointer' : 'inherit')};
`;

export const MaterialIcon: React.FC<MaterialIconProps> = ({
  name,
  className = '',
  size = 'md',
  onClick,
}) => (
  <MaterialIconWrapper
    className={`material-icons ${className}`}
    size={size}
    onClick={onClick}
  >
    {name}
  </MaterialIconWrapper>
);

// ==================== Font Awesome Icons ====================

// Re-export FontAwesomeIcon with a shorter name
export { FontAwesomeIcon as FaIcon } from '@fortawesome/react-fontawesome';

// Wrapper component for consistent styling
interface FaIconWrapperProps extends Omit<FontAwesomeIconProps, 'icon'> {
  icon: IconName | FontAwesomeIconProps['icon'];
}

export const FaIconStyled: React.FC<FaIconWrapperProps> = ({ icon, ...props }) => (
  <FontAwesomeIcon icon={icon} {...props} />
);

// ==================== Generic Icon Component ====================

interface IconProps {
  // For Material icons: just the name (e.g., 'edit', 'settings')
  // For FA icons: 'fa-' prefix (e.g., 'fa-code-branch', 'fa-trash')
  name: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  onClick?: () => void;
}

/**
 * Generic Icon component that automatically detects Material vs Font Awesome icons.
 * - Names starting with 'fa-' or 'fas-' are Font Awesome
 * - All other names are Material Icons
 */
export const Icon: React.FC<IconProps> = ({ name, className, size, onClick }) => {
  const isFontAwesome = name.startsWith('fa-') || name.startsWith('fas-') || name.startsWith('far-');

  if (isFontAwesome) {
    // Convert 'fa-code-branch' to 'code-branch' for FontAwesome
    const iconName = name.replace(/^(fa[sr]?-)?/, '') as IconName;
    const faSize = size === 'sm' ? 'sm' : size === 'lg' ? 'lg' : size === 'xl' ? '2x' : undefined;
    return (
      <FontAwesomeIcon
        icon={['fas', iconName]}
        className={className}
        size={faSize}
        onClick={onClick}
        style={{ cursor: onClick ? 'pointer' : undefined }}
      />
    );
  }

  return (
    <MaterialIcon
      name={name}
      className={className}
      size={size}
      onClick={onClick}
    />
  );
};

export default Icon;
