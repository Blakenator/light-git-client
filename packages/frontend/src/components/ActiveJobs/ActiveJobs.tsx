import React, { useMemo } from 'react';
import styled, { keyframes } from 'styled-components';
import { Tooltip } from 'react-bootstrap';
import { Icon, TooltipTrigger } from '@light-git/core';
import { useJobStore, JobStatus } from '../../stores';
import type { Job } from '../../stores/jobStore';

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

// Derive a compact fingerprint of active jobs so the component only re-renders
// when the set of jobs or their running state actually changes.
function selectActiveJobSummary(state: { queues: Map<string, string[]>; jobs: Map<string, Job>; runningChannels: Set<string> }) {
  let totalJobs = 0;
  let hasRunning = false;
  const ids: string[] = [];
  state.queues.forEach((queue) => {
    queue.forEach((jobId) => {
      const job = state.jobs.get(jobId);
      if (job) {
        totalJobs++;
        ids.push(jobId);
        if (job.status === JobStatus.IN_PROGRESS) hasRunning = true;
      }
    });
  });
  return { totalJobs, hasRunning, ids };
}

function activeJobSummaryEqual(
  a: ReturnType<typeof selectActiveJobSummary>,
  b: ReturnType<typeof selectActiveJobSummary>,
) {
  if (a.totalJobs !== b.totalJobs || a.hasRunning !== b.hasRunning) return false;
  if (a.ids.length !== b.ids.length) return false;
  for (let i = 0; i < a.ids.length; i++) {
    if (a.ids[i] !== b.ids[i]) return false;
  }
  return true;
}

export const ActiveJobs: React.FC = () => {
  const { totalJobs, hasRunning, ids } = useJobStore(
    selectActiveJobSummary,
    activeJobSummaryEqual,
  );
  const isRunning = hasRunning;
  const hasJobs = totalJobs > 0;

  // Build the full job list only when we actually need it (tooltip hover).
  // The list is memoized on the ids fingerprint so it doesn't rebuild each render.
  const activeJobs = useMemo(() => {
    const { queues, jobs } = useJobStore.getState();
    const result: Job[] = [];
    queues.forEach((queue) => {
      queue.forEach((jobId) => {
        const job = jobs.get(jobId);
        if (job) result.push(job);
      });
    });
    return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids]);

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
