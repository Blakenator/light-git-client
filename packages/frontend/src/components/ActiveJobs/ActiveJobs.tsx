import React from 'react';
import styled from 'styled-components';
import { Tooltip } from 'react-bootstrap';
import { TooltipTrigger } from '@light-git/core';
import { useJobStore, JobStatus } from '../../stores';
import { LoadingSpinner } from '@light-git/core';

const ActiveJobsContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.25rem 0.5rem;
`;

const JobCount = styled.span`
  font-size: 0.875rem;
  color: ${({ theme }) => theme.colors.secondary};
`;

const JobList = styled.div`
  max-width: 300px;
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
`;

const JobStatusBadge = styled.span<{ status: JobStatus }>`
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

export const ActiveJobs: React.FC = () => {
  const activeJobs = useJobStore((state) => state.getActiveJobs());
  const isRunning = activeJobs.some((job) => job.status === JobStatus.IN_PROGRESS);

  if (activeJobs.length === 0) {
    return null;
  }

  const tooltip = (
    <Tooltip id="active-jobs-tooltip">
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
    </Tooltip>
  );

  return (
    <TooltipTrigger placement="bottom" overlay={tooltip}>
      <ActiveJobsContainer>
        {isRunning && <LoadingSpinner size="sm" />}
        <JobCount>
          {activeJobs.length} job{activeJobs.length !== 1 ? 's' : ''}
        </JobCount>
      </ActiveJobsContainer>
    </TooltipTrigger>
  );
};

export default ActiveJobs;
