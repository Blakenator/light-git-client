import React from 'react';
import styled, { keyframes } from 'styled-components';
import { Tooltip } from 'react-bootstrap';
import { Icon, TooltipTrigger } from '@light-git/core';
import { useJobStore, JobStatus } from '../../stores';

const WideTooltip = styled(Tooltip)`
  .tooltip-inner {
    max-width: 300px;
    text-align: left;
  }
`;

const INDICATOR_SIZE = '1.5rem';
const INDICATOR_BORDER = '2.5px';

const spin = keyframes`
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
`;

const ActiveJobsContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.25rem 0.5rem;
  /* Reserve fixed space so the layout doesn't shift */
  min-width: calc(${INDICATOR_SIZE} + 1rem);
`;

const IndicatorRing = styled.div<{ $spinning: boolean }>`
  position: relative;
  width: ${INDICATOR_SIZE};
  height: ${INDICATOR_SIZE};
  border-radius: 50%;
  border: ${INDICATOR_BORDER} solid
    ${({ $spinning, theme }) =>
      $spinning ? theme.colors.light : theme.colors.border};
  border-top-color: ${({ $spinning, theme }) =>
    $spinning ? theme.colors.primary : theme.colors.border};
  animation: ${({ $spinning }) => ($spinning ? spin : 'none')} 0.8s linear
    infinite;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const CountLabel = styled.span`
  font-size: 0.625rem;
  font-weight: 600;
  line-height: 1;
  color: ${({ theme }) => theme.colors.secondary};
`;

const IdleIndicator = styled.div`
  width: ${INDICATOR_SIZE};
  height: ${INDICATOR_SIZE};
  border-radius: 50%;
  border: ${INDICATOR_BORDER} solid ${({ theme }) => theme.colors.border};
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0.4;
`;

const IdleCheckIcon = styled.span`
  font-size: 0.55rem;
  color: ${({ theme }) => theme.colors.border};
  display: flex;
  align-items: center;
  justify-content: center;
`;

const JobList = styled.div`
  padding: 0.5rem;
`;

const JobItem = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.25rem 0;
  font-size: 0.875rem;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};

  &:last-child {
    border-bottom: none;
  }
`;

const JobName = styled.span`
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const JobStatusBadge = styled.span<{ status: JobStatus }>`
  flex-shrink: 0;
  font-size: 0.75rem;
  padding: 0.125rem 0.375rem;
  border-radius: 0.25rem;
  background-color: ${({ status, theme }) => {
    switch (status) {
      case JobStatus.IN_PROGRESS:
        return theme.colors.info;
      case JobStatus.SCHEDULED:
        return theme.colors.warning;
      case JobStatus.SUCCEEDED:
        return theme.colors.success;
      case JobStatus.FAILED:
        return theme.colors.danger;
      default:
        return theme.colors.secondary;
    }
  }};
  color: ${({ theme }) => theme.colors.white};
`;

/*
 * Wrapper that counter-rotates children so text stays upright
 * while the parent IndicatorRing spins.
 */
const CountWrapper = styled.span<{ $spinning: boolean }>`
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  animation: ${({ $spinning }) => ($spinning ? spin : 'none')} 0.8s linear
    infinite;
  animation-direction: reverse;
`;

export const ActiveJobs: React.FC = () => {
  const activeJobs = useJobStore((state) => state.getActiveJobs());
  const isRunning = activeJobs.some(
    (job) => job.status === JobStatus.IN_PROGRESS,
  );
  const hasJobs = activeJobs.length > 0;

  /* Idle state — no active jobs */
  if (!hasJobs) {
    return (
      <TooltipTrigger
        placement="bottom"
        overlay={<Tooltip id="no-jobs-tooltip">No active jobs</Tooltip>}
      >
        <ActiveJobsContainer>
          <IdleIndicator>
            <IdleCheckIcon>
            <Icon name="fa-check" size="sm" />
          </IdleCheckIcon>
          </IdleIndicator>
        </ActiveJobsContainer>
      </TooltipTrigger>
    );
  }

  const tooltip = (
    <WideTooltip id="active-jobs-tooltip">
      <JobList>
        {activeJobs.map((job) => (
          <JobItem key={job.id}>
            <JobName>{job.config.command}</JobName>
            <JobStatusBadge status={job.status}>
              {job.status === JobStatus.IN_PROGRESS ? 'Running' : 'Queued'}
            </JobStatusBadge>
          </JobItem>
        ))}
      </JobList>
    </WideTooltip>
  );

  return (
    <TooltipTrigger placement="bottom" overlay={tooltip}>
      <ActiveJobsContainer>
        <IndicatorRing $spinning={isRunning}>
          <CountWrapper $spinning={isRunning}>
            <CountLabel>{activeJobs.length}</CountLabel>
          </CountWrapper>
        </IndicatorRing>
      </ActiveJobsContainer>
    </TooltipTrigger>
  );
};

export default ActiveJobs;
