import React, { useMemo } from 'react';
import { OverlayTrigger, OverlayTriggerProps, Tooltip } from 'react-bootstrap';

export interface TooltipTriggerProps extends Omit<OverlayTriggerProps, 'overlay'> {
  /**
   * The tooltip text or content to display.
   * If provided, this will automatically wrap the content in a Tooltip component.
   * If you need more control, use the `overlay` prop instead.
   */
  tooltip?: React.ReactNode;
  
  /**
   * Optional ID for the tooltip. If not provided, one will be auto-generated.
   */
  tooltipId?: string;
  
  /**
   * Override the overlay prop if you need full control over the tooltip content.
   * If both `tooltip` and `overlay` are provided, `overlay` takes precedence.
   */
  overlay?: OverlayTriggerProps['overlay'];
  
  /**
   * Delay in milliseconds before showing/hiding the tooltip.
   * Defaults to { show: 500, hide: 0 }
   */
  delay?: OverlayTriggerProps['delay'];
}

/**
 * Wrapper around OverlayTrigger that sets a global default delay of 500ms for tooltips.
 * This ensures consistent tooltip behavior across the application.
 * 
 * @example
 * // Simple usage with just tooltip text
 * <TooltipTrigger tooltip="Click me">
 *   <Button>Hover me</Button>
 * </TooltipTrigger>
 * 
 * @example
 * // With custom ID
 * <TooltipTrigger tooltip="Branch name" tooltipId="branch-tooltip">
 *   <span>main</span>
 * </TooltipTrigger>
 * 
 * @example
 * // Advanced usage with overlay prop (full control)
 * <TooltipTrigger overlay={<Tooltip id="custom">Custom content</Tooltip>}>
 *   <Button>Advanced</Button>
 * </TooltipTrigger>
 */
export const TooltipTrigger: React.FC<TooltipTriggerProps> = ({
  delay = { show: 500, hide: 0 },
  tooltip,
  tooltipId,
  overlay,
  ...props
}) => {
  // Generate overlay from tooltip prop if provided and overlay is not
  const generatedOverlay = useMemo(() => {
    if (overlay) {
      return overlay;
    }
    
    if (tooltip != null) {
      // Auto-generate ID if not provided
      const id = tooltipId || `tooltip-${Math.random().toString(36).substr(2, 9)}`;
      return <Tooltip id={id}>{tooltip}</Tooltip>;
    }
    
    return undefined;
  }, [tooltip, tooltipId, overlay]);

  return <OverlayTrigger delay={delay} overlay={generatedOverlay} {...props} />;
};

export default TooltipTrigger;
